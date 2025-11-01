from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="BackupManager API",
    description="Database backup management system",
    version="1.0.0"
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


# Import and include routers
# from app.api.routes import backups, projects, databases
# app.include_router(backups.router, prefix="/api/backups", tags=["backups"])
# app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
# app.include_router(databases.router, prefix="/api/databases", tags=["databases"])
