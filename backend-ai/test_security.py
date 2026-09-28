import unittest
import grpc

from app.security import is_valid_service_token, require_service_token_configuration
from fastapi.testclient import TestClient
from app.grpc_service import pb2, pb2_grpc
from app.grpc_service.security_interceptor import ServiceTokenServerInterceptor


class ServiceTokenTests(unittest.TestCase):
    def test_accepts_only_matching_configured_token(self):
        self.assertTrue(is_valid_service_token("a" * 40, "a" * 40))
        self.assertFalse(is_valid_service_token("b" * 40, "a" * 40))
        self.assertFalse(is_valid_service_token(None, "a" * 40))

    def test_rejects_missing_or_short_server_secret(self):
        self.assertFalse(is_valid_service_token("", ""))
        self.assertFalse(is_valid_service_token("short", "short"))

    def test_service_refuses_to_start_without_a_long_secret(self):
        with self.assertRaises(RuntimeError):
            require_service_token_configuration("short")
        require_service_token_configuration("x" * 32)


class PrivateApiTests(unittest.TestCase):
    def test_private_routes_reject_missing_service_token(self):
        from app.main import app

        response = TestClient(app).get("/api/skills")

        self.assertEqual(response.status_code, 401)

    def test_health_does_not_reveal_model_or_document_inventory(self):
        from app.main import app

        response = TestClient(app).get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("model", response.json())
        self.assertNotIn("chromadb_documents_count", response.json())

    def test_metrics_are_prometheus_formatted_and_do_not_include_prompts(self):
        from app.main import app

        response = TestClient(app).get("/metrics")

        self.assertEqual(response.status_code, 200)
        self.assertIn("backend_ai_chat_requests_total", response.text)
        self.assertNotIn("session-", response.text)


class GrpcAuthenticationTests(unittest.IsolatedAsyncioTestCase):
    async def test_grpc_rejects_missing_or_invalid_service_token(self):
        class HealthServicer(pb2_grpc.AgentServiceServicer):
            async def HealthCheck(self, request, context):
                return pb2.HealthCheckResponse(status=pb2.HealthCheckResponse.SERVING)

        token = "s" * 40
        server = grpc.aio.server(interceptors=[ServiceTokenServerInterceptor(token)])
        pb2_grpc.add_AgentServiceServicer_to_server(HealthServicer(), server)
        port = server.add_insecure_port("127.0.0.1:0")
        await server.start()
        channel = grpc.aio.insecure_channel(f"127.0.0.1:{port}")
        stub = pb2_grpc.AgentServiceStub(channel)
        try:
            for metadata in ((), (("x-service-token", "wrong"),)):
                with self.assertRaises(grpc.aio.AioRpcError) as error:
                    await stub.HealthCheck(pb2.HealthCheckRequest(), metadata=metadata)
                self.assertEqual(error.exception.code(), grpc.StatusCode.UNAUTHENTICATED)

            response = await stub.HealthCheck(
                pb2.HealthCheckRequest(), metadata=(("x-service-token", token),)
            )
            self.assertEqual(response.status, pb2.HealthCheckResponse.SERVING)
        finally:
            await channel.close()
            await server.stop(grace=0)


if __name__ == "__main__":
    unittest.main()
