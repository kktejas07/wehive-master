from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
router = APIRouter(prefix="/blogs")
@router.get("")
def read_blogs():
    return {"message": "blogs"}
app.include_router(router)
client = TestClient(app)
h = {"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"}
print("OPTIONS /blogs:", client.options("/blogs", headers=h).status_code)
print("OPTIONS /blogs/:", client.options("/blogs/", headers=h).status_code)
