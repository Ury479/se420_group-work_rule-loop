import { MindRegulationDashboard } from '@/components/mind-regulation-dashboard'
import { getMindRegulationDashboard } from '@/app/actions/mind-regulation'

export const metadata={title:'心念调伏 | 人生操作系统',description:'识别当下心念状态，选择最小现实行动，并复盘沉淀为个人规则。'}
export default async function MindRegulationPage(){const data=await getMindRegulationDashboard();return <main className="flex flex-col gap-8"><header className="flex flex-col gap-2 border-b pb-6"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Mind regulation</p><h1 className="text-2xl font-semibold text-balance sm:text-3xl">心念调伏</h1><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">目的不是压制念头，而是识别状态、降低干扰，并回到当下最小可执行行动。</p></header><MindRegulationDashboard data={data}/></main>}
