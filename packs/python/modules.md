---
paths:
  - "**/*.py"
---

# Python

- Follow the style of the file you are editing, including the formatter the project already runs.
- Type the arguments and return value of a public function. A private helper may stay untyped when the surrounding code is untyped.
- Raise a specific exception. Do not use a bare `except`.
- Use `pathlib` for new filesystem paths. Leave an existing `os.path` call as it is when you are not already changing that line.
- Add a dependency to the manifest the project already uses (`pyproject.toml`, `requirements.txt` or `Pipfile`). Do not introduce a second one.
