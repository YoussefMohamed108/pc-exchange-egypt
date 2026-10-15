# Automatic PC backend startup

The Windows task **PC Exchange Egypt - Backend** runs for the current user, with limited privileges, 20 seconds after Windows sign-in. It uses a hidden PowerShell launcher and Node supervisor. Docker Desktop needs an interactive Windows session, so this starts after sign-in, not at the lock screen before anyone logs in.

The supervisor checks every minute when healthy and backs off to five minutes after repeated failures. It starts Docker Desktop if necessary, starts the installed Compose images without building code or applying migrations, restores the Cloudflare tunnel, and updates the public connection settings at Vercel. When the tunnel address changes, it rebuilds the **existing production deployment**, preserving the production source stored at Vercel. It never uploads unfinished local edits. Allow several minutes for startup, tunnel DNS and Vercel's rebuild.

Database, photos and evidence stay in their existing Docker volumes. The backend must remain awake and online. Existing Cloudflare quick tunnels still have their development-service availability limits; automatic recovery does not create a stable domain. Brevo's authorized IP must be updated separately if the ISP changes this PC's public address.

## Controls

Run from this project directory:

```powershell
npm run backend:startup-status
npm run backend:stop
npm run backend:resume
npm run backend:startup-disable
```

`backend:stop` pauses recovery and stops this project's containers and tunnel without deleting data. `backend:resume` clears that pause, enables the task and resumes recovery. `backend:startup-disable` stops the supervisor and disables its logon trigger while leaving running containers and tunnel alone. `backend:autostart` installs/replaces the task and starts it. Reinstall after moving the project or its executable paths.

Startup state and rotating logs are in `.artifacts/backend/autostart-status.json` and `autostart.log`. The latter redacts backend environment values. A configuration fingerprint avoids repeated Vercel deployments while the backend address is unchanged. A tunnel process that is alive but repeatedly unhealthy is replaced only after three failed recovery checks; PID ownership is checked against the cloudflared executable and the project's loopback gateway.

## Credentials and updates

The desktop app's Vercel login profile was not visible to Task Scheduler. The authorized login is reused in `.artifacts/backend/vercel`, with Windows ACL access restricted to the owner and SYSTEM. This ignored folder never goes to Git or Vercel. Both manual project deployments and the supervisor use that CLI store so refreshed credentials stay consistent. No credentials appear in the task's arguments; only allowlisted public Supabase configuration is sent to Vercel. If the Vercel session is revoked, renew it using `npx vercel@64.0.2 login --global-config ".artifacts/backend/vercel"`.

Installing new backend code and migrations remains explicit with `npm run backend:up`. New frontend source is deployed through reviewed pull requests into protected `main`; Vercel waits for its GitHub checks. Startup recovery only starts installed images and redeploys existing production source. `npm run deploy:vercel` remains an operator recovery command. See [the GitHub/Vercel workflow](github-vercel-workflow.md).

## Acceptance

Windows registration and a simulated stopped-container/tunnel recovery are tested on this PC. A full Windows reboot is not performed automatically. Docker Desktop's cold launch after a physical reboot remains to be observed on the user's next sign-in.

References: [Docker Desktop startup settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/), [Cloudflare quick tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [Vercel redeploy](https://vercel.com/docs/cli/redeploy), [environment-variable rotation](https://vercel.com/docs/environment-variables/rotating-secrets).
