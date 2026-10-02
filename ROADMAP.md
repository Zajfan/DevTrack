# DevTrack roadmap

The [GitHub milestones](https://github.com/Zajfan/DevTrack/milestones) and their issues are the maintained backlog. Use issue state for current progress; historical implementation checklists are not the current TODO list.

## Current position

Desktop project management, file/README browsing, completed GitHub work filters, planned local tasks and GitHub issues, version/prerelease sorting, and exact clickable tags are implemented. Windows, both macOS architectures, Linux, and the dark Android companion have draft packages. Linux workflow checks and Android browser/native emulator checks passed; the owner also reported successful Android phone installation.

The release remains a draft until all requested platforms are ready and verified. Native iOS is pending by the owner's request, and native HarmonyOS is not yet available. See [release notes](docs/releases/1.0.0.md) and [verification evidence](docs/releases/1.0-verification.md).

## 1.0 — release readiness

The workspace task consistency fixes are tracked as 1.0 release bugs: [#9](https://github.com/Zajfan/DevTrack/issues/9) Overview task counts, [#10](https://github.com/Zajfan/DevTrack/issues/10) All Tasks, [#11](https://github.com/Zajfan/DevTrack/issues/11) completed commit evidence, [#12](https://github.com/Zajfan/DevTrack/issues/12) consistent local and GitHub work, and [#13](https://github.com/Zajfan/DevTrack/issues/13) Reports work data. Local task versions are assigned in DevTrack; linked GitHub issues remain read-only and inherit their target version from the GitHub milestone.

[Milestone 1.0](https://github.com/Zajfan/DevTrack/milestone/1)

| Issue | Work |
| --- | --- |
| [#1](https://github.com/Zajfan/DevTrack/issues/1) | Build, sign and verify a genuine native HarmonyOS companion |
| [#2](https://github.com/Zajfan/DevTrack/issues/2) | Native iOS companion and packaging — pending |
| [#3](https://github.com/Zajfan/DevTrack/issues/3) | Verify Windows EXE/MSI installation, upgrade and desktop workflows |
| [#4](https://github.com/Zajfan/DevTrack/issues/4) | Verify macOS Intel and Apple Silicon installation, upgrade and workflows |
| [#5](https://github.com/Zajfan/DevTrack/issues/5) | Refresh README/changelog, reconcile old checklists and maintain release documentation |

No paid Apple or Huawei membership is authorized. A PWA does not replace native iOS, and an APK does not replace a native HarmonyOS HAP. iOS availability must remain honest about signing and installation limitations. No release date is promised while these requirements remain unresolved.

## 1.1 — complete manual transfer

[Milestone 1.1](https://github.com/Zajfan/DevTrack/milestone/2)

| Issue | Work |
| --- | --- |
| [#6](https://github.com/Zajfan/DevTrack/issues/6) | Complete two-way desktop/mobile transfer, including notes, repository references, stable identities, validation and recovery |

Current desktop task exports can seed the companion, but omit notes/repository URLs. Companion backups cannot currently be imported into desktop. This milestone fixes manual transfer; it does not promise automatic synchronization.

## 1.2 — synchronization and private GitHub access

[Milestone 1.2](https://github.com/Zajfan/DevTrack/milestone/3)

| Issue | Work |
| --- | --- |
| [#7](https://github.com/Zajfan/DevTrack/issues/7) | Automatic offline-first desktop/phone synchronization, with conflict handling and recovery; depends on #6 |
| [#8](https://github.com/Zajfan/DevTrack/issues/8) | Secure mobile authentication and read-only access to authorized private GitHub repositories |

Desktop's existing optional Git synchronization is separate from phone synchronization. The mobile companion currently reads public GitHub repositories without authentication.

## See this backlog in DevTrack

Open the DevTrack project, refresh its GitHub issues in Planned work, then filter by GitHub source and target version. The numeric milestone titles `1.0`, `1.1` and `1.2` supply the issue target versions and sort in release order. Desktop GitHub access uses your authenticated `gh` CLI; the companion can fetch this public repository by refreshing GitHub. GitHub issues remain read-only in the application; edit their state and criteria on GitHub.
