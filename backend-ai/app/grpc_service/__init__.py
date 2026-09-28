import sys
from pathlib import Path

# Ensure this package directory is in sys.path so generated protobuf imports resolve cleanly
_pkg_dir = str(Path(__file__).resolve().parent)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

import agent_service_pb2 as pb2
import agent_service_pb2_grpc as pb2_grpc

__all__ = ["pb2", "pb2_grpc"]
