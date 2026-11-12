import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, Info, Sparkles } from "lucide-react"

export default function ThemeDemoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">主题系统演示</h1>
        <p className="mt-2 text-muted-foreground">
          展示三套配色方案(石墨/汽油蓝/酒红) × 亮暗模式的所有设计 token
        </p>
      </div>

      {/* 主要颜色 */}
      <Card>
        <CardHeader>
          <CardTitle>主要颜色</CardTitle>
          <CardDescription>背景、前景、卡片、弹出层</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-background p-4 text-foreground">
              <div className="font-medium">Background / Foreground</div>
              <div className="text-sm text-muted-foreground">页面主背景与文本</div>
            </div>
            <div className="rounded-lg bg-card p-4 text-card-foreground shadow-card">
              <div className="font-medium">Card</div>
              <div className="text-sm text-muted-foreground">卡片容器</div>
            </div>
            <div className="rounded-lg bg-popover p-4 text-popover-foreground shadow-card">
              <div className="font-medium">Popover</div>
              <div className="text-sm text-muted-foreground">弹出层</div>
            </div>
            <div className="rounded-lg bg-muted p-4 text-muted-foreground">
              <div className="font-medium">Muted</div>
              <div className="text-sm">次要信息背景</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交互颜色 */}
      <Card>
        <CardHeader>
          <CardTitle>交互颜色</CardTitle>
          <CardDescription>主色、次色、强调色</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-primary p-4 text-primary-foreground">
              <div className="font-medium">Primary</div>
              <div className="text-sm opacity-90">主行动色</div>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-secondary-foreground">
              <div className="font-medium">Secondary</div>
              <div className="text-sm opacity-90">次要行动色</div>
            </div>
            <div className="rounded-lg bg-accent p-4 text-accent-foreground">
              <div className="font-medium">Accent</div>
              <div className="text-sm opacity-90">Hover 背景色</div>
            </div>
          </div>
          <div className="rounded-lg bg-highlight/15 p-4">
            <div className="font-medium text-highlight">Highlight</div>
            <div className="text-sm text-muted-foreground">品牌强调色(非 hover)</div>
          </div>
        </CardContent>
      </Card>

      {/* 语义颜色 */}
      <Card>
        <CardHeader>
          <CardTitle>语义颜色</CardTitle>
          <CardDescription>成功、警告、错误、精神、信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-success/15 p-4">
              <CheckCircle className="h-6 w-6 text-success" />
              <div>
                <div className="font-medium text-success">Success</div>
                <div className="text-sm text-muted-foreground">成功状态</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-warning/15 p-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <div>
                <div className="font-medium text-warning">Warning</div>
                <div className="text-sm text-muted-foreground">警告状态</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-destructive/15 p-4">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <div className="font-medium text-destructive">Destructive</div>
                <div className="text-sm text-muted-foreground">危险/错误</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-spirit/15 p-4">
              <Sparkles className="h-6 w-6 text-spirit" />
              <div>
                <div className="font-medium text-spirit">Spirit</div>
                <div className="text-sm text-muted-foreground">精神力</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-info/15 p-4">
              <Info className="h-6 w-6 text-info" />
              <div>
                <div className="font-medium text-info">Info</div>
                <div className="text-sm text-muted-foreground">信息提示</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 按钮组 */}
      <Card>
        <CardHeader>
          <CardTitle>按钮样式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button>默认按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="destructive">危险按钮</Button>
            <Button disabled>禁用按钮</Button>
          </div>
        </CardContent>
      </Card>

      {/* 徽章 */}
      <Card>
        <CardHeader>
          <CardTitle>徽章</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge>默认</Badge>
            <Badge variant="secondary">次要</Badge>
            <Badge variant="outline">轮廓</Badge>
            <Badge variant="destructive">危险</Badge>
            <Badge className="bg-success/15 text-success hover:bg-success/25">成功</Badge>
            <Badge className="bg-warning/15 text-warning hover:bg-warning/25">警告</Badge>
            <Badge className="bg-info/15 text-info hover:bg-info/25">信息</Badge>
            <Badge className="bg-spirit/15 text-spirit hover:bg-spirit/25">精神</Badge>
          </div>
        </CardContent>
      </Card>

      {/* HUD 效果 */}
      <Card>
        <CardHeader>
          <CardTitle>HUD 特效</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="hud-cta">金色主行动按钮</Button>
          <div className="hud-glow text-2xl font-bold">强调标题光晕效果</div>
          <div className="hud-tile flex items-center gap-3 rounded-lg p-4 text-info">
            <Info className="h-8 w-8" />
            <div>
              <div className="font-medium">HUD 图标底座</div>
              <div className="text-sm opacity-75">语义色描边 + 半透明背景</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 图表颜色 */}
      <Card>
        <CardHeader>
          <CardTitle>图表颜色</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-lg"
                style={{ backgroundColor: `var(--chart-${i})` }}
              >
                <div className="flex h-full items-center justify-center font-mono text-sm font-medium text-white">
                  Chart {i}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 边框与圆角 */}
      <Card>
        <CardHeader>
          <CardTitle>边框与圆角</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-sm border-2 border-border p-4">
              <div className="font-medium">Border</div>
              <div className="text-sm text-muted-foreground">标准边框色</div>
            </div>
            <div className="rounded-lg border-2 border-input p-4">
              <div className="font-medium">Input</div>
              <div className="text-sm text-muted-foreground">输入框边框</div>
            </div>
            <div className="rounded-xl border-2 border-ring p-4">
              <div className="font-medium">Ring</div>
              <div className="text-sm text-muted-foreground">聚焦环颜色</div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          圆角基准: --radius = 0.75rem, 从 sm 到 4xl 递增
        </CardFooter>
      </Card>
    </div>
  )
}
