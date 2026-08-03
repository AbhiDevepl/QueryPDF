from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .vectorstore import get_vectorstore


def process_pdf(document_id: str, file_path: str) -> int:
    loader = PyPDFLoader(file_path)
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["page_number"] = chunk.metadata.get("page", 0)
        chunk.metadata["document_id"] = document_id

    vectorstore: Chroma = get_vectorstore()
    vectorstore.add_documents(chunks)

    return len(pages)
