from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

COLLECTION_NAME = "documents"
PERSIST_DIR = "./chroma_data"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL),
        persist_directory=PERSIST_DIR,
    )


def delete_document_vectors(document_id: str) -> None:
    vectorstore = get_vectorstore()
    vectorstore.delete(where={"document_id": document_id})
