# ResumeLens API

All API routes return JSON except the authenticated resume download route. Protected routes require the platform-provided authenticated user identity. Missing identity returns `401`.

## `POST /api/reports`

Creates and saves an ATS report.

Content type: `multipart/form-data`

| Field | Required | Rules |
| --- | --- | --- |
| `resume` | Yes | PDF or DOCX, exact MIME/extension match, 1 byte–10 MB, PDF maximum 15 pages |
| `jobDescription` | No | Plain text, maximum 20,000 characters |

Success: `201`

```json
{ "report": { "id": "uuid", "overallScore": 82 } }
```

Validation errors return `400`; missing authentication returns `401`; bounded parsing, storage, or database failures return `500` with `{ "error": "message" }`. If file storage succeeds but report persistence fails, the uploaded object is removed as a compensating rollback.

## `POST /api/reports/sample`

Returns an authenticated, non-persistent sample analysis. It does not write to D1 or R2.

Success: `200`

```json
{
  "filename": "sample-operations-analyst-resume.pdf",
  "analysis": {
    "mode": "job_match",
    "overallScore": 82,
    "keywordScore": 78,
    "structureScore": 85,
    "impactScore": 83,
    "essentialsScore": 90,
    "matchedKeywords": [],
    "missingKeywords": [],
    "strengths": [],
    "recommendations": [],
    "sections": [],
    "stats": {}
  }
}
```

Scores in this example are illustrative; the route returns the current deterministic engine output.

## `DELETE /api/reports/:id`

Permanently deletes the authenticated user's report and its original resume file.

- `200`: `{ "deleted": true }`
- `404`: report does not exist or is not owned by the user

## `GET /api/resumes/:id`

Downloads the authenticated user's original resume. The response uses the saved content type, private/no-store caching, `nosniff`, and an attachment filename.

- `200`: binary file stream
- `404`: report/file does not exist or is not owned by the user

## Error format

```json
{ "error": "Human-readable message" }
```

Unexpected server errors are logged as structured JSON without logging resume contents, job-description contents, or file bytes.
