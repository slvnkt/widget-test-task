# Widget test task

Campaign delivery widget for Simulmedia TV+: one linear TV campaign, network post-logs + ACR data, every state across the campaign lifecycle, desktop web.

**Live prototype:** https://slvnkt.github.io/widget-test-task/

## Stack

- React 19 + Vite + TypeScript
- [Omnitaki DS](https://github.com/slvnkt/omnitaki-ds) as a git submodule (`ds/`): tokens and all UI components
- Charts: shadcn/ui chart pattern (`ChartContainer`, `ChartConfig`, `ChartTooltipContent`) on Recharts, colored with DS tokens
- Mock data: one campaign model in `src/data/campaign.ts`; every state is derived from it

## Run

```bash
git clone --recurse-submodules https://github.com/slvnkt/widget-test-task.git
cd widget-test-task && npm install && npm run dev
```
