import unittest
from unittest.mock import MagicMock
from app.utils import get_code_owner, get_codeowner_from_file

class TestUtils(unittest.TestCase):
    def test_get_code_owner(self):
        repo = MagicMock()
        hunk = MagicMock()
        hunk.starting_line = 1
        hunk.ending_line = 10
        hunk.commit.author.login = "dev1"
        repo.get_blame.return_value = [hunk]
        owner = get_code_owner(repo, "file.py", 5)
        self.assertEqual(owner, "dev1")

    def test_get_codeowner_from_file(self):
        repo = MagicMock()
        codeowners_content = MagicMock()
        codeowners_content.decoded_content.decode.return_value = "file.py @dev2"
        repo.get_contents.return_value = codeowners_content
        owner = get_codeowner_from_file(repo, "file.py")
        self.assertEqual(owner, "dev2")

if __name__ == "__main__":
    unittest.main() 