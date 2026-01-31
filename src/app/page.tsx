export default function Home() {
  return (
    <main className="app-shell">
      <div className="container stack-lg">
        <span className="kicker font-pixel pixel-accent">Paste</span>
        <h1 className="page-title">在线粘贴板</h1>
        <p className="page-lede">
          温暖、亲和的粘贴板体验。全局设计令牌已就绪，像素字体仅用于
          点缀。
        </p>
        <div className="surface-card stack-sm">
          <p className="tagline">主题基线：圆润现代 + 中度像素点缀</p>
          <div className="stack-xs">
            <span>主色：#5BA3A0</span>
            <span>圆角：16px / 10px / 6px</span>
            <span>边距：移动 24px · 桌面 48px</span>
          </div>
        </div>
      </div>
    </main>
  );
}
