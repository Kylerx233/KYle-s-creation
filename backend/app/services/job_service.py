class JobService:
    def create_job(self, scene: str) -> dict[str, str]:
        return {"job_id": f"job-{scene}", "status": "queued"}
