import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-1">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">隐私政策</h1>
      </div>

      {/* 内容区域 */}
      <div className="px-5 py-6 space-y-6 text-sm text-gray-700 leading-relaxed">
        <div className="text-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">有鱼记账隐私政策</h2>
          <p className="text-gray-400 text-xs">更新日期：2024年3月</p>
        </div>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">引言</h3>
          <p>有鱼记账（以下简称"我们"）非常重视用户的隐私保护。本隐私政策将向您说明我们如何收集、使用、存储和保护您的个人信息。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">一、我们收集的信息</h3>
          <p className="mb-2">我们可能收集以下信息：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>账号信息：</strong>手机号、昵称、头像</li>
            <li><strong>记账数据：</strong>您录入的收支记录、分类信息</li>
            <li><strong>设备信息：</strong>设备型号、操作系统版本</li>
            <li><strong>使用数据：</strong>功能使用情况、操作日志</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">二、信息使用</h3>
          <p className="mb-2">我们使用您的信息用于：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>提供记账服务及功能</li>
            <li>数据同步和备份</li>
            <li>服务优化和改进</li>
            <li>账户安全保障</li>
            <li>向您发送服务通知</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">三、信息存储</h3>
          <p className="mb-2">1. <strong>存储位置：</strong>您的数据存储在安全的服务器上，采用加密传输和存储。</p>
          <p className="mb-2">2. <strong>本地存储：</strong>记账数据同时在本地存储，确保离线可用。</p>
          <p>3. <strong>数据保留：</strong>我们仅在提供服务所需期间保留您的信息。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">四、信息安全</h3>
          <p className="mb-2">我们采取多种安全措施保护您的信息：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>数据加密传输（SSL/TLS）</li>
            <li>敏感信息加密存储</li>
            <li>访问控制和身份验证</li>
            <li>定期安全审计</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">五、信息共享</h3>
          <p className="mb-2">我们不会向第三方出售您的个人信息。仅在以下情况下可能共享：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>获得您的明确同意</li>
            <li>法律法规要求</li>
            <li>保护我们的合法权益</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">六、您的权利</h3>
          <p className="mb-2">您对自己的个人信息拥有以下权利：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>访问和查看您的信息</li>
            <li>更正不准确的信息</li>
            <li>删除您的账号和数据</li>
            <li>导出您的数据</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">七、政策更新</h3>
          <p>我们可能会不时更新本隐私政策。更新后的政策将在软件内公布，重大变更我们会通过适当方式通知您。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">八、联系我们</h3>
          <p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
          <p className="mt-2">📧 邮箱：support@youyujizhang.com</p>
        </section>

        <div className="pt-6 text-center text-gray-400 text-xs">
          <p>感谢您信任有鱼记账！</p>
        </div>
      </div>
    </div>
  );
}
