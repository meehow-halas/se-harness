---
paths:
  - "**/*.csproj"
  - "**/Directory.Build.props"
  - "**/Directory.Packages.props"
  - "**/global.json"
  - "**/.editorconfig"
  - "**/*.globalconfig"
---

# .NET project files

- When the repo uses central package management (`Directory.Packages.props`), add the package version there and leave `Version` off the `PackageReference`.
- Do not change `TargetFramework`, `LangVersion`, `Nullable`, or `TreatWarningsAsErrors` as a side effect of a feature.
- Do not change analyzer severities, `NoWarn`, or `.editorconfig` / `.globalconfig` settings as a side effect of a feature.
- Put a property shared by several projects in `Directory.Build.props`. Do not copy it into each project.
- Do not commit secrets in `appsettings*.json` or project files. Use user secrets locally and the project's secret store in deployment.
