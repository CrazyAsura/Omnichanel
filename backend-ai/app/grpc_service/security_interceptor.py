import grpc
import logging

from app.security import is_valid_service_token

logger = logging.getLogger("omnichannel-ai.grpc.security")


class ServiceTokenServerInterceptor(grpc.aio.ServerInterceptor):
    def __init__(self, token: str):
        self.token = token

    async def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata or ())
        candidate = metadata.get("x-service-token")
        handler = await continuation(handler_call_details)
        if handler is None or is_valid_service_token(candidate, self.token):
            return handler
        logger.warning(
            "security_audit rpc=%s outcome=authentication_failure",
            handler_call_details.method,
        )

        async def reject(request, context):
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid service credentials")

        if handler.unary_unary:
            return grpc.unary_unary_rpc_method_handler(
                reject,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer,
            )
        return handler
