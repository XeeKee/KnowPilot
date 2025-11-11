"""
Private information management system with vector retrieval capabilities.

This module provides a comprehensive solution for managing private library files
with semantic search functionality. It handles file storage, vectorization using
local or remote embedding models, and persistent Chroma vector stores for each
user session. The system supports multiple embedding backends including
sentence-transformers and transformers libraries.
"""

import time
import uuid
from typing import Optional, Dict, List, Any
import tempfile
import os
import logging
import re

# Try to import vector retrieval dependencies with graceful fallback
try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import Chroma
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain.schema import Document
    from langchain.embeddings.base import Embeddings
    from typing import List
    VECTOR_SUPPORT = True
except ImportError as e:
    print(f"⚠️ Vector retrieval dependencies not available: {e}")
    print("To enable vector retrieval, install: pip install langchain langchain-community langchain-huggingface chromadb")
    VECTOR_SUPPORT = False

# Try to import sentence_transformers separately for local model support
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    print("⚠️ sentence-transformers not available, will try alternative approach")
    SENTENCE_TRANSFORMERS_AVAILABLE = False

# Try to import transformers as alternative embedding backend
try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    import numpy as np
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    print("⚠️ transformers not available either")
    TRANSFORMERS_AVAILABLE = False


class LocalSentenceTransformerEmbeddings(Embeddings):
    """
    Custom embedding class for local models using transformers.
    
    This class provides a unified interface for both sentence-transformers and
    transformers libraries, allowing the system to work with local embedding
    models without requiring internet access for model validation.
    """
    
    def __init__(self, model_path: str):
        """
        Initialize the embedding model from a local path.
        
        Args:
            model_path: Path to the local embedding model directory
            
        Raises:
            ImportError: If neither sentence-transformers nor transformers is available
        """
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                # For local path, use local_files_only to avoid HF validation
                self.model = SentenceTransformer(model_path, local_files_only=True)
                self.use_sentence_transformers = True
                print(f"✅ Loaded local SentenceTransformer model from: {model_path}")
            except Exception as st_error:
                print(f"⚠️ SentenceTransformer failed: {st_error}")
                if TRANSFORMERS_AVAILABLE:
                    print("🔄 Falling back to transformers...")
                    self.tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
                    self.model = AutoModel.from_pretrained(model_path, local_files_only=True)
                    self.use_sentence_transformers = False
                    print(f"✅ Loaded local transformers model from: {model_path}")
                else:
                    raise st_error
        elif TRANSFORMERS_AVAILABLE:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
            self.model = AutoModel.from_pretrained(model_path, local_files_only=True)
            self.use_sentence_transformers = False
            print(f"✅ Loaded local transformers model from: {model_path}")
        else:
            raise ImportError("Neither sentence-transformers nor transformers is available")
    
    def _mean_pooling(self, model_output, attention_mask):
        """
        Perform mean pooling for transformers model output.
        
        This method computes the weighted average of token embeddings using
        attention mask weights, which is a standard approach for creating
        sentence-level embeddings from token-level outputs.
        
        Args:
            model_output: Output from the transformer model
            attention_mask: Attention mask indicating valid tokens
            
        Returns:
            Pooled sentence embedding tensor
        """
        token_embeddings = model_output[0]
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of documents using the loaded model.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors for each text
        """
        if self.use_sentence_transformers:
            embeddings = self.model.encode(texts)
            return embeddings.tolist()
        else:
            # Use transformers with mean pooling for each text individually
            embeddings = []
            for text in texts:
                encoded_input = self.tokenizer(text, padding=True, truncation=True, return_tensors='pt')
                with torch.no_grad():
                    model_output = self.model(**encoded_input)
                    sentence_embedding = self._mean_pooling(model_output, encoded_input['attention_mask'])
                    embeddings.append(sentence_embedding.squeeze().numpy().tolist())
            return embeddings
    
    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single query text.
        
        Args:
            text: Single text string to embed
            
        Returns:
            Embedding vector for the text
        """
        if self.use_sentence_transformers:
            embedding = self.model.encode([text])
            return embedding[0].tolist()
        else:
            # Use transformers with mean pooling
            encoded_input = self.tokenizer(text, padding=True, truncation=True, return_tensors='pt')
            with torch.no_grad():
                model_output = self.model(**encoded_input)
                sentence_embedding = self._mean_pooling(model_output, encoded_input['attention_mask'])
                return sentence_embedding.squeeze().numpy().tolist()


class EmbeddingModelManager:
    """
    Singleton manager for embedding model to avoid multiple loading.
    
    This class ensures that only one instance of the embedding model is loaded
    in memory, even if multiple components request embeddings. It implements
    lazy loading to defer model initialization until first use.
    """
    _instance = None
    _model = None
    _initialized = False
    
    def __new__(cls):
        """Ensure only one instance exists (singleton pattern)."""
        if cls._instance is None:
            cls._instance = super(EmbeddingModelManager, cls).__new__(cls)
        return cls._instance
    
    def get_embeddings(self, embedding_model: str):
        """
        Get or create embeddings instance with lazy loading.
        
        Args:
            embedding_model: Path to local model or name of remote model
            
        Returns:
            Initialized embedding model instance
            
        Raises:
            Exception: If model loading fails
        """
        if not self._initialized:
            print(f"🔍 Loading embedding model (first time): {embedding_model}")
            start_time = time.time()
            
            # Check if it's a local path
            model_path_exists = os.path.exists(embedding_model)
            
            if model_path_exists:
                print(f"📁 Local model path detected, loading local model...")
                try:
                    self._model = LocalSentenceTransformerEmbeddings(embedding_model)
                    print(f"✅ Local vector model initialized successfully")
                except Exception as local_e:
                    print(f"❌ Local model loading failed: {local_e}")
                    raise local_e
            else:
                print(f"🌐 Remote model name detected, using HuggingFace Hub...")
                try:
                    self._model = HuggingFaceEmbeddings(
                        model_name=embedding_model,
                        model_kwargs={'device': 'cpu'}
                    )
                    print(f"✅ Remote vector model initialized successfully")
                except Exception as remote_e:
                    print(f"❌ Remote model loading failed: {remote_e}")
                    raise remote_e
            
            duration = time.time() - start_time
            print(f"⏱️ Embedding model loaded in {duration:.2f} seconds")
            self._initialized = True
        else:
            print(f"♻️ Reusing already loaded embedding model")
        
        return self._model


class PrivateInformation:
    """
    Private information management class with vector retrieval capabilities.
    
    This class handles private library files for each session with semantic search
    functionality. It manages file storage, text chunking, vectorization, and
    persistent Chroma vector stores for efficient retrieval of relevant content.
    """

    def __init__(self, 
                 chunk_size: int = 1000, 
                 chunk_overlap: int = 200,
                 embedding_model: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../paraphrase-MiniLM-L6-v2")),
                 top_k_default: int = 5):
        """
        Initialize private information manager with vector retrieval.
        
        Args:
            chunk_size: Text chunk size for splitting documents
            chunk_overlap: Text chunk overlap size to maintain context
            embedding_model: Path to embedding model or model name
            top_k_default: Default number of top results to return from search
        """
        # Use dictionary to store private files for each session
        self.private_files = {}
        
        # Vector retrieval configuration
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k_default = top_k_default
        self.embedding_model_path = embedding_model
        
        # Vector stores for each session (will contain lists of vectorstores)
        self.session_vectorstores = {}
        
        # Initialize text splitter but defer embedding model loading
        if VECTOR_SUPPORT:
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size, 
                chunk_overlap=self.chunk_overlap
            )
            # Use lazy loading for embeddings to avoid startup delays
            self.embedding_manager = EmbeddingModelManager()
            self.embeddings = None  # Will be loaded when first needed
            print(f"📋 Vector support available - embedding model will be loaded on first use")
            print(f"📁 Model path configured: {embedding_model}")
        else:
            self.text_splitter = None
            self.embedding_manager = None
            self.embeddings = None
            print(f"❌ Vector support not available")
    
    def _ensure_embeddings_loaded(self):
        """
        Ensure embedding model is loaded (lazy loading).
        
        Returns:
            bool: True if embeddings are ready, False otherwise
        """
        if VECTOR_SUPPORT and self.embedding_manager and self.embeddings is None:
            try:
                print(f"🚀 Loading embedding model on first use...")
                self.embeddings = self.embedding_manager.get_embeddings(self.embedding_model_path)
                return True
            except Exception as e:
                print(f"❌ Failed to load embedding model: {e}")
                self.embeddings = None
                return False
        return self.embeddings is not None
    
    def _load_all_vectorstores_for_session(self, session_id: str, session_dir: str):
        """
        Load all persistent vectorstores for a session from disk.
        
        This method scans the session directory and loads existing vectorstores
        into memory, allowing the system to resume operations after restart.
        
        Args:
            session_id: Session identifier
            session_dir: Directory path for the session
        """
        import os
        from langchain_community.vectorstores import Chroma
        if not os.path.isdir(session_dir):
            return
        if session_id not in self.session_vectorstores:
            self.session_vectorstores[session_id] = []
        self.session_vectorstores[session_id] = []
        for file_dir in os.listdir(session_dir):
            file_store_dir = os.path.join(session_dir, file_dir)
            if os.path.isdir(file_store_dir):
                try:
                    vectorstore = Chroma(
                        persist_directory=file_store_dir,
                        embedding_function=self.embeddings
                    )
                    self.session_vectorstores[session_id].append(vectorstore)
                except Exception as e:
                    print(f"Failed to load vectorstore for {file_dir}: {e}")
    
    def generate_session_id(self) -> str:
        """
        Generate a unique session ID.
        
        Returns:
            str: Unique UUID string for session identification
        """
        return str(uuid.uuid4())
    
    def _create_vectorstore_for_session(self, session_id: str, documents: List[Document], file_identifier: str = None) -> Optional[Any]:
        """
        Create persistent vector store for a specific session and file.
        
        This method creates a Chroma vectorstore with persistent storage,
        allowing the embeddings to survive application restarts.
        
        Args:
            session_id: Session identifier
            documents: List of document chunks to vectorize
            file_identifier: Optional file name for directory organization
            
        Returns:
            Chroma vectorstore instance or None if creation fails
        """
        if not self._ensure_embeddings_loaded() or not documents:
            return None
        
        try:
            # Create persistent directory for this session's vector store
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../private_chroma_stores'))
            session_dir = os.path.join(base_dir, session_id)
            print(f"📂 Private KB base_dir: {base_dir}")
            print(f"📂 Private KB session_dir: {session_dir}")
            os.makedirs(session_dir, exist_ok=True)
            
            if file_identifier:
                # Sanitize file identifier for directory name to avoid path issues
                safe_identifier = file_identifier.replace('/', '_').replace('\\', '_')
                persist_dir = os.path.join(session_dir, safe_identifier)
            else:
                persist_dir = os.path.join(session_dir, 'default')
            
            os.makedirs(persist_dir, exist_ok=True)
            
            from langchain_community.vectorstores import Chroma
            vectorstore = Chroma.from_documents(
                documents=documents,
                embedding=self.embeddings,
                persist_directory=persist_dir
            )
            vectorstore.persist()
            identifier_info = f" for file '{file_identifier}'" if file_identifier else ""
            print(f"🔍 Created persistent vector store for session {session_id}{identifier_info} with {len(documents)} chunks")
            return vectorstore
        except Exception as e:
            print(f"❌ Failed to create vector store for session {session_id}: {e}")
            return None
    
    def _process_content_for_vectorization(self, files_data: List[Dict[str, Any]]) -> List[Document]:
        """
        Process file content and split into chunks for vectorization.
        
        This method handles text preprocessing, removes format markers, and
        splits documents into chunks suitable for embedding generation.
        
        Args:
            files_data: List of file data dictionaries with content
            
        Returns:
            List of Document objects ready for vectorization
        """
        if not self.text_splitter:
            return []
        
        documents = []
        for file_data in files_data:
            file_name = file_data.get('name', 'unknown')
            file_content = file_data.get('content', '')
            
            if file_content.strip():
                # Preprocess file content, remove possible format markers
                cleaned_content = file_content
                # Remove common file type markers that might interfere with content analysis
                file_type_pattern = re.compile(r'^\s*\[(PDF|Word|Excel) (Document|File):\s*[^\]]+\]\s*', re.IGNORECASE)
                cleaned_content = re.sub(file_type_pattern, '', cleaned_content)
                
                # Create document with metadata for tracking and retrieval
                doc = Document(
                    page_content=cleaned_content,
                    metadata={
                        'source': file_name,
                        'file_type': file_data.get('type', 'unknown'),
                        'file_size': file_data.get('size', 0),
                        'upload_time': file_data.get('upload_time', time.time())
                    }
                )
                
                # Split document into chunks for optimal vectorization
                chunks = self.text_splitter.split_documents([doc])
                documents.extend(chunks)
                print(f"📄 Split file '{file_name}' into {len(chunks)} chunks")
        
        return documents
    
    def save_private_files(self, files_data: List[Dict[str, Any]], session_id: Optional[str] = None) -> str:
        """
        Save private files to specified session with vectorization and persistent Chroma storage.
        
        This method processes uploaded files, creates vector embeddings, and stores
        them persistently for future retrieval. It handles both new file uploads
        and session management.
        
        Args:
            files_data: List of file data dictionaries
            session_id: Optional session identifier, generates new one if not provided
            
        Returns:
            str: Session identifier for the saved files
        """
        import os
        if session_id is None:
            session_id = self.generate_session_id()

        # First, update self.private_files from persistent vectorstores using get_private_files
        existing_files_data = self.get_private_files(session_id)
        existing_files = existing_files_data.get('files', []) if existing_files_data else []
        
        # Process uploaded files to get file info in standardized format
        processed_files = self.process_uploaded_files(files_data)
        
        # Extract file info (without content) from processed files
        new_file_infos = []
        for file_data in processed_files:
            new_file_infos.append({
                'name': file_data.get('name'),
                'type': file_data.get('type'),
                'size': file_data.get('size'),
                'upload_time': file_data.get('upload_time'),
                'status': file_data.get('status')
            })

        # Merge with existing file infos (avoid duplicates by name)
        existing_names = {f['name'] for f in existing_files}
        combined_files = existing_files + [f for f in new_file_infos if f['name'] not in existing_names]

        # Update self.private_files
        self.private_files[session_id] = {
            'files': combined_files,
            'timestamp': time.time(),
            'uuid': session_id
        }

        # Create persistent vectorstore for each new file
        if VECTOR_SUPPORT and self._ensure_embeddings_loaded():
            print("✅ Vector support and embeddings ready, processing content...")
            
            # Directory for persistent vectorstores (align with docker volume /app/private_chroma_stores)
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../private_chroma_stores'))
            session_dir = os.path.join(base_dir, session_id)
            
            # Load all existing vectorstores for this session
            self._load_all_vectorstores_for_session(session_id, session_dir)

            # For each new file, create its vectorstore using helper functions
            for file_data in processed_files:
                file_name = file_data.get('name')
                
                # Skip if file with same name already exists in vectorstore
                if file_name in existing_names:
                    print(f"⚠️ File '{file_name}' already exists, skipping vectorstore creation")
                    continue
                
                # Process content for vectorization using existing helper function
                documents = self._process_content_for_vectorization([file_data])
                
                if documents:
                    # Create vectorstore using existing helper function
                    vectorstore = self._create_vectorstore_for_session(session_id, documents, file_name)
                    if vectorstore:
                        # Add new vectorstore to the list
                        if session_id not in self.session_vectorstores:
                            self.session_vectorstores[session_id] = []
                        self.session_vectorstores[session_id].append(vectorstore)
                        print(f"✅ Created vectorstore for file '{file_name}' in session {session_id}")

        print(f"📁 Saved {len(new_file_infos)} new private files for session {session_id}")
        print(f"📂 Total files in session: {len(combined_files)}")
        return session_id
    
    def retrieve_relevant_content(self, query: str, session_id: str, top_k: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve most relevant content based on semantic similarity.
        
        This method performs semantic search across all vectorstores in a session,
        filters results by similarity threshold, and returns the most relevant
        content chunks with metadata.
        
        Args:
            query: Search query string
            session_id: Session identifier
            top_k: Number of top results to return
            
        Returns:
            List of relevant content chunks with metadata and similarity scores
        """
        if top_k is None:
            top_k = self.top_k_default
        
        # Check if vectorstores exist for this session
        if session_id not in self.session_vectorstores:
            print(f"⚠️ No vector stores found for session {session_id}")
            return None

        vectorstores = self.session_vectorstores[session_id]
        if not vectorstores or len(vectorstores) == 0:
            print(f"⚠️ No vector stores available for session {session_id}")
            return None
        
        try:
            # Collect results from all vectorstores with their similarity scores
            all_results_with_similarities = []
            all_candidates_debug = []  # keep all candidates for debug even if filtered out
            for i, vectorstore in enumerate(vectorstores):
                try:
                    # Use similarity_search_with_score to get similarity scores
                    store_results_with_scores = vectorstore.similarity_search_with_score(query, k=top_k)
                    # Set similarity threshold for quality filtering
                    similarity_threshold = 0.17                  
                    # Filter out results with similarity below threshold
                    filtered_results = []
                    for j, (doc, score) in enumerate(store_results_with_scores):
                        import math
                        # Convert squared distance to similarity using more appropriate formula
                        distance = math.sqrt(score)
                        similarity = 1.0 / (1.0 + distance)
                        # Debug: only print similarity
                        source_name = doc.metadata.get('source', 'unknown')
                        logging.info(f"[PrivateLib][VS {i+1}] Candidate {j+1} similarity={similarity:.6f}")
                        all_candidates_debug.append((source_name, similarity))
                        if similarity >= similarity_threshold:
                            filtered_results.append((doc, similarity))

                    print(f"🔍 Vectorstore {i+1}/{len(vectorstores)}: Found {len(store_results_with_scores)} results, kept {len(filtered_results)} after filtering")
                    if len(filtered_results) == 0 and len(store_results_with_scores) > 0:
                        # Build readable list from store_results_with_scores for debugging
                        tmp = []
                        for (d, s) in store_results_with_scores:
                            import math as _m
                            tmp.append((d.metadata.get('source','unknown'), s, 1.0/(1.0+_m.sqrt(s))))
                        tmp.sort(key=lambda x: x[2], reverse=True)
                        for k, (src, sc, sim) in enumerate(tmp[:3]):
                            logging.info(f"[PrivateLib][VS {i+1}] Top cand {k+1}: similarity={sim:.6f} (below threshold)")
                    all_results_with_similarities.extend(filtered_results)
                except Exception as e:
                    print(f"⚠️ Error searching vectorstore {i+1}: {e}")
                    continue
            
            if not all_results_with_similarities:
                print(f"⚠️ Query '{query}' found no relevant results, all similarities below threshold")
                # Emit a concise summary of best candidates across all vectorstores
                if all_candidates_debug:
                    all_candidates_debug.sort(key=lambda x: x[1], reverse=True)
                    for idx, (src, sim) in enumerate(all_candidates_debug[:5]):
                        logging.info(f"[PrivateLib] Global top cand {idx+1}: similarity={sim:.6f} (below threshold)")
                return None
            
            # Sort all results by similarity in descending order
            all_results_with_similarities.sort(key=lambda x: x[1], reverse=True)
            
            top_results = all_results_with_similarities[:]

            if len(all_results_with_similarities) > top_k:
                print(f"🔍 Query '{query[:50]}...' found {len(all_results_with_similarities)} results, taking top {top_k} by similarity")
                # Take top_k most relevant results
                top_results = all_results_with_similarities[:top_k]

            
            print(f"📊 Total found {len(top_results)} relevant results")
            
            # Process and format all results
            relevant_content = []
            for i, (doc, similarity) in enumerate(top_results):
                relevant_content.append({
                    'rank': i + 1,
                    'content': doc.page_content,
                    'source': doc.metadata.get('source', 'unknown'),
                    'file_type': doc.metadata.get('file_type', 'unknown'),
                    'chunk_id': f"{session_id}_{i}",
                    'similarity': similarity
                })            
            
            # Show preview of results sorted by similarity
            print("📑 Results sorted by similarity:")
            for i, item in enumerate(relevant_content[:3]):  # Only show preview of first 3 results
                print(f"  {i+1}. Similarity: {item['similarity']:.4f}, Source: {item['source']}")
                preview = item['content'][:100].replace('\n', ' ')
                print(f"     '{preview}...'")               
            return relevant_content
            
        except Exception as e:
            print(f"❌ Error during similarity search: {e}")
            return None

    
    def get_relevant_content_for_generation(self, query: str, session_id: str, top_k: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Get relevant content formatted for article generation.
        
        This method retrieves relevant content and formats it into a structure
        suitable for article generation systems, providing title, description,
        and content snippets.
        
        Args:
            query: Search query to find relevant content
            session_id: Session identifier
            top_k: Number of top results to return
            
        Returns:
            List of chunks with structure: [{'title', 'description', 'snippets', 'source'}]
        """
        relevant_content = self.retrieve_relevant_content(query, session_id, top_k)
        
        if not relevant_content:
            return None
        
        # Format relevant content as chunks for article generation
        chunks = []
        for item in relevant_content:
            chunk = {
                'title': f"{item['source']} - Chunk {item['chunk_id']}",
                'description': 'Content from uploaded private files',
                'snippets': [item['content']],
                'source': item['source']
            }
            chunks.append(chunk)
        
        return chunks if chunks else None
    
    def preload_session_data(self, session_id: str) -> bool:
        """
        Preload private file information and vector storage for specified session_id.
        
        This method is called after successful user login to avoid delays in
        subsequent operations. It scans the persistent storage and loads
        vectorstores into memory for faster access.
        
        Args:
            session_id: Session identifier (usually user email)
            
        Returns:
            bool: Whether data was successfully preloaded
        """
        try:
            print(f"🔄 Starting to preload data for session {session_id}...")
            start_time = time.time()
            
            # Quick check if data is already loaded to avoid redundant work
            if (session_id in self.private_files and 
                session_id in self.session_vectorstores and 
                len(self.session_vectorstores[session_id]) > 0):
                print(f"⚡ Session {session_id} data already loaded, skipping preload")
                return True
            
            # Try to load embeddings, but don't block file listing if it fails
            embeddings_ready = self._ensure_embeddings_loaded()
            if not embeddings_ready:
                print(f"⚠️ Embedding model not loaded, will only scan files without loading vectorstores")
            
            import os
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../private_chroma_stores'))
            session_dir = os.path.join(base_dir, session_id)
            
            # Check if session directory exists
            if not os.path.isdir(session_dir):
                print(f"📁 Session {session_id} has no private file storage directory yet")
                # Initialize empty data structures
                self.private_files[session_id] = {
                    'files': [],
                    'timestamp': time.time(),
                    'uuid': session_id
                }
                self.session_vectorstores[session_id] = []
                return True
            
            # 1. Preload private_files by scanning disk (always possible)
            files_info = []
            vectorstores_loaded = []
            
            for file_dir in os.listdir(session_dir):
                file_store_dir = os.path.join(session_dir, file_dir)
                if os.path.isdir(file_store_dir):
                    # Always add file info based on folder name (fallback)
                    files_info.append({
                        'name': file_dir,
                        'type': 'unknown',
                        'size': 0,
                        'upload_time': time.time(),
                        'status': 'processed'
                    })
                    
                    # Only try to load vectorstore if embeddings are ready
                    if embeddings_ready:
                        try:
                            from langchain_community.vectorstores import Chroma
                            vectorstore = Chroma(
                                persist_directory=file_store_dir,
                                embedding_function=self.embeddings
                            )
                            vectorstores_loaded.append(vectorstore)
                            
                            # Try to get metadata from vectorstore for better file info
                            try:
                                docs = vectorstore.get(include=['metadatas'])
                                if docs and 'metadatas' in docs and docs['metadatas']:
                                    meta = docs['metadatas'][0]
                                    # Update the file info with metadata
                                    for fi in files_info:
                                        if fi['name'] == file_dir:
                                            fi.update({
                                                'name': meta.get('source', file_dir),
                                                'type': meta.get('file_type', 'unknown'),
                                                'size': meta.get('file_size', 0),
                                                'upload_time': meta.get('upload_time', time.time())
                                            })
                                            break
                            except Exception as meta_e:
                                print(f"⚠️ Failed to read metadata from {file_dir}: {meta_e}")
                        except Exception as e:
                            print(f"⚠️ Failed to load vectorstore {file_dir}: {e}")
                            # File info already added above, so continue
            
            # 2. Update in-memory data structures
            self.private_files[session_id] = {
                'files': files_info,
                'timestamp': time.time(),
                'uuid': session_id
            }
            
            # Initialize or clear existing vectorstores list
            if session_id not in self.session_vectorstores:
                self.session_vectorstores[session_id] = []
            else:
                self.session_vectorstores[session_id].clear()
            
            # Add successfully loaded vectorstores (only if any)
            if vectorstores_loaded:
                self.session_vectorstores[session_id].extend(vectorstores_loaded)
            
            # 3. Output preload results
            files_count = len(files_info)
            vectorstores_count = len(vectorstores_loaded)
            duration = time.time() - start_time
            
            print(f"✅ Session {session_id} data preload completed in {duration:.2f}s:")
            print(f"   📄 Private files: {files_count}")
            print(f"   🧠 Vector stores: {vectorstores_count}")
            if not embeddings_ready:
                print(f"   ⚠️ Note: Embedding model not loaded, vectorstores will be loaded when needed")
            
            if files_count > 0:
                print(f"   📋 File list: {[f['name'] for f in files_info]}")
            
            return True
            
        except Exception as e:
            duration = time.time() - start_time if 'start_time' in locals() else 0
            print(f"❌ Error occurred while preloading session {session_id} data after {duration:.2f}s: {e}")
            self.private_files[session_id] = {
                'files': [],
                'timestamp': time.time(),
                'uuid': session_id
            }
            self.session_vectorstores[session_id] = []
            # Even if embeddings failed, we still have file list, so return True
            return True
    
    def has_vector_capability(self, session_id: str) -> bool:
        """
        Check if vector retrieval is available for the session.
        
        This method verifies that embeddings are loaded and vectorstores
        exist for the specified session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            bool: True if vector retrieval is available
        """
        return (self._ensure_embeddings_loaded() and 
                session_id in self.session_vectorstores and 
                self.session_vectorstores[session_id] and 
                len(self.session_vectorstores[session_id]) > 0)
    
    def get_private_files(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get private files for specified session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with file information or empty structure if not initialized
        """
        if session_id not in self.private_files:
            self.private_files[session_id] = {
                'files': [],
                'timestamp': time.time(),
                'uuid': session_id
            }
        return self.private_files.get(session_id)
    
    def delete_private_file(self, file_name: str, session_id: str) -> bool:
        """
        Delete specific private file from specified session and remove persistent vectorstore.
        
        This method removes the file from memory, deletes the persistent
        vectorstore directory, and updates the session's vectorstore list.
        
        Args:
            file_name: Name of file to delete
            session_id: Session identifier
            
        Returns:
            bool: True if any changes were made
        """
        import os
        # Remove from self.private_files
        changed = False
        if session_id in self.private_files:
            files_data = self.private_files[session_id]['files']
            updated_files = [f for f in files_data if f.get('name') != file_name]
            if len(updated_files) != len(files_data):
                self.private_files[session_id]['files'] = updated_files
                changed = True
        # Remove persistent vectorstore dir
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../private_chroma_stores'))
        session_dir = os.path.join(base_dir, session_id)
        safe_identifier = file_name.replace('/', '_').replace('\\', '_')
        file_store_dir = os.path.join(session_dir, safe_identifier)
        if os.path.isdir(file_store_dir):
            import shutil
            try:
                shutil.rmtree(file_store_dir)
                changed = True
            except Exception as e:
                print(f"Failed to delete vectorstore dir {file_store_dir}: {e}")
        # Also update self.session_vectorstores
        if session_id in self.session_vectorstores:
            # Remove vectorstores for this file
            new_list = []
            for vs in self.session_vectorstores[session_id]:
                try:
                    # Try to check if this vectorstore is for the file
                    docs = vs.get(include=['metadatas'])
                    if docs and 'metadatas' in docs and docs['metadatas']:
                        meta = docs['metadatas'][0]
                        if meta.get('source') != file_name:
                            new_list.append(vs)
                    else:
                        new_list.append(vs)
                except Exception:
                    new_list.append(vs)
            self.session_vectorstores[session_id] = new_list
        return changed
       
    
    def cleanup_old_sessions(self, session_ids_to_keep: List[str]) -> None:
        """
        Clean up private files for sessions not in the keep list.
        
        This method removes old session data from memory to prevent
        memory leaks and maintain system performance.
        
        Args:
            session_ids_to_keep: List of session IDs to preserve
        """
        sessions_to_delete = []
        for session_id in self.private_files.keys():
            if session_id not in session_ids_to_keep:
                sessions_to_delete.append(session_id)
        
        for session_id in sessions_to_delete:
            del self.private_files[session_id]
            
            # Clean up vector stores
            if session_id in self.session_vectorstores:
                self.session_vectorstores[session_id] = []
        
        print(f"🧹 Cleaned up {len(sessions_to_delete)} old sessions")
    
    def get_session_files_info(self, session_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get basic file information without content for specified session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of file information dictionaries or None if no files
        """
        private_files_data = self.get_private_files(session_id)
        
        if not private_files_data or not private_files_data.get('files'):
            return None
        
        files_info = []
        for file_data in private_files_data['files']:
            files_info.append({
                'name': file_data.get('name'),
                'type': file_data.get('type'),
                'size': file_data.get('size'),
                'upload_time': file_data.get('upload_time'),
                'status': file_data.get('status')
            })
        
        return files_info
    
    def process_uploaded_files(self, files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process uploaded files and return processed file data.
        
        This method standardizes file data format and adds metadata
        like upload time and processing status.
        
        Args:
            files: List of raw file data dictionaries
            
        Returns:
            List of processed file data dictionaries
        """
        processed_files = []
        
        for file_data in files:
            file_name = file_data.get('name', 'unknown')
            file_content = file_data.get('content', '')
            file_type = file_data.get('type', 'unknown')
            file_size = file_data.get('size', 0)
            
            print(f"Processing file: {file_name} ({file_type}, {file_size} bytes)")
            
            processed_files.append({
                'name': file_name,
                'content': file_content,
                'type': file_type,
                'size': file_size,
                'upload_time': time.time(),
                'status': 'processed'
            })
        
        return processed_files
