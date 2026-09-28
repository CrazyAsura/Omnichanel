package com.omnichannel.backend.grpc;

import net.devh.boot.grpc.server.service.GrpcService;
import io.grpc.stub.StreamObserver;

@GrpcService
public class GreetingGrpcService extends GreetingServiceGrpc.GreetingServiceImplBase {
    @Override
    public void greet(GreetingRequest request, StreamObserver<GreetingReply> responseObserver) {
        var name = request.getName().isBlank() ? "mundo" : request.getName();
        responseObserver.onNext(GreetingReply.newBuilder().setMessage("Olá, " + name + "!").build());
        responseObserver.onCompleted();
    }
}
