from typing import Any


def get_code_owner(repo: Any, file_path: str, line_number: int) -> str | None:
    """
    Use git blame to find the last committer for the given file and line.
    """
    try:
        blame = repo.get_blame(file_path)
        for hunk in blame:
            if hunk.starting_line <= line_number <= hunk.ending_line:
                return hunk.commit.author.login
    except Exception as e:
        print(f"Blame failed: {e}")
    return None

def get_codeowner_from_file(repo: Any, file_path: str) -> str | None:
    """
    Parse CODEOWNERS file if present.
    """
    try:
        codeowners = repo.get_contents("CODEOWNERS")
        lines = codeowners.decoded_content.decode().splitlines()
        for line in lines:
            if file_path in line:
                return line.split()[-1].replace("@", "")
    except Exception as e:
        print(f"CODEOWNERS not found or parse error: {e}")
    return None 