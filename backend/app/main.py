from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.core.database import init_db, SessionLocal
from app.core.init_admin import create_default_admin
from app.api.routes import auth, groups


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: Initialize database and create admin user
    print("🚀 Starting BackupManager API...")
    init_db()
    print("✅ Database initialized")

    # Create default admin user
    db = SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()

    yield

    # Shutdown
    print("👋 Shutting down BackupManager API...")


app = FastAPI(
    title="BackupManager API",
    description="Database backup management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "BackupManager API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "debug": os.getenv("DEBUG", "False")
    }


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])

# Future routers
# from app.api.routes import backups, projects, databases
# app.include_router(backups.router, prefix="/api/backups", tags=["backups"])
# app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
# app.include_router(databases.router, prefix="/api/databases", tags=["databases"])
