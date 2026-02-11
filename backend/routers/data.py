"""
Data analysis router — file upload, filtering, aggregation, stats, plotting.
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException

import json
import logging
import numpy as np

import store
from services.data_engine import (
    load_file,
    load_zip,
    get_column_info,
    filter_data,
    aggregate_data,
    describe_data,
    generate_plot,
)
from models.schemas import (
    UploadDataResponse,
    UploadedFileInfo,
    ColumnInfo,
    FilterRequest,
    AggregateRequest,
    PlotRequest,
    DataResponse,
    PlotResponse,
    StatsResponse,
)


class _NumpyEncoder(json.JSONEncoder):
    """Safely convert numpy types to native Python for JSON."""
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return super().default(obj)


def _safe_preview(df) -> list[dict]:
    """Convert df.head() to JSON-safe list of dicts (no numpy types)."""
    raw = df.head(5).fillna("").to_dict(orient="records")
    # Round-trip through JSON to convert numpy scalars → native Python
    return json.loads(json.dumps(raw, cls=_NumpyEncoder))


logger = logging.getLogger("lab-copilot.data")

router = APIRouter()


def _get_df(file_id: str | None):
    """Resolve a DataFrame from the store."""
    fid = file_id or store.active_dataset_id
    if not fid or fid not in store.data_frames:
        raise HTTPException(status_code=404, detail="No dataset found. Upload a file first.")
    return fid, store.data_frames[fid]


# ── Upload ───────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadDataResponse)
async def upload_data(file: UploadFile = File(...)):
    """Upload a CSV, Excel, or ZIP file. ZIP files are extracted and all CSVs inside are loaded."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    contents = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    # Determine file type and load accordingly
    loaded_frames: list[tuple[str, object]] = []
    if ext == "zip":
        try:
            loaded_frames = load_zip(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process ZIP: {e}")
        file_type = "zip"
    elif ext in ("csv", "xls", "xlsx"):
        try:
            df = load_file(contents, file.filename)
            loaded_frames = [(file.filename, df)]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")
        file_type = ext
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Upload CSV, Excel, or ZIP.",
        )

    # Store each loaded DataFrame and build response
    file_infos = []
    for fname, df in loaded_frames:
        try:
            file_id = uuid.uuid4().hex[:12]
            store.data_frames[file_id] = df
            store.data_meta[file_id] = {
                "filename": fname,
                "columns": list(df.columns),
                "row_count": len(df),
            }
            store.active_dataset_id = file_id  # last one becomes active

            col_info = get_column_info(df)
            preview = _safe_preview(df)

            file_infos.append(UploadedFileInfo(
                file_id=file_id,
                filename=fname,
                columns=list(df.columns),
                column_info=[ColumnInfo(**c) for c in col_info],
                row_count=len(df),
                preview=preview,
            ))
        except Exception as e:
            logger.error("Error processing file %s from upload: %s", fname, e, exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error processing '{fname}': {e}")

    return UploadDataResponse(
        files=file_infos,
        file_type=file_type,
        total_files=len(file_infos),
    )


# ── List datasets ───────────────────────────────────────────────────────────

@router.get("/list")
def list_datasets():
    """Return metadata for all uploaded datasets."""
    return {
        "datasets": [
            {"file_id": fid, **meta}
            for fid, meta in store.data_meta.items()
        ],
        "active_dataset_id": store.active_dataset_id,
    }


# ── Filter ───────────────────────────────────────────────────────────────────

@router.post("/filter", response_model=DataResponse)
def filter_endpoint(req: FilterRequest):
    """Filter the active dataset with a pandas query string."""
    fid, df = _get_df(req.file_id)
    try:
        result = filter_data(df, req.conditions)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Filter error: {e}")
    return DataResponse(
        data=result.head(100).fillna("").to_dict(orient="records"),
        columns=list(result.columns),
        row_count=len(result),
    )


# ── Aggregate ────────────────────────────────────────────────────────────────

@router.post("/aggregate", response_model=DataResponse)
def aggregate_endpoint(req: AggregateRequest):
    """Group & aggregate the active dataset."""
    fid, df = _get_df(req.file_id)
    try:
        result = aggregate_data(df, req.group_column, req.value_column, req.agg_func)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Aggregation error: {e}")
    return DataResponse(
        data=result.fillna("").to_dict(orient="records"),
        columns=list(result.columns),
        row_count=len(result),
    )


# ── Describe ─────────────────────────────────────────────────────────────────

@router.post("/describe", response_model=StatsResponse)
def describe_endpoint(file_id: str | None = None):
    """Return descriptive statistics for the active dataset."""
    fid, df = _get_df(file_id)
    stats = describe_data(df)
    return StatsResponse(statistics=stats)


# ── Plot ─────────────────────────────────────────────────────────────────────

@router.post("/plot", response_model=PlotResponse)
def plot_endpoint(req: PlotRequest):
    """Generate a Plotly chart from the active dataset."""
    fid, df = _get_df(req.file_id)
    try:
        plot_json = generate_plot(
            df,
            plot_type=req.plot_type,
            x_col=req.x_column,
            y_col=req.y_column,
            title=req.title,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Plot error: {e}")
    return PlotResponse(plot_json=plot_json, plot_type=req.plot_type)
