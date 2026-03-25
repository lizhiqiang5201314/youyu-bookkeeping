import { ArrowLeft } from 'lucide-react';

export function UserAgreementPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-1">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">用户协议</h1>
      </div>

      {/* 内容区域 */}
      <div className="px-5 py-6 space-y-6 text-sm text-gray-700 leading-relaxed">
        <div className="text-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">有鱼记账用户协议</h2>
          <p className="text-gray-400 text-xs">更新日期：2024年3月</p>
        </div>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">一、协议范围</h3>
          <p>欢迎使用有鱼记账！本协议是您（用户）与有鱼记账之间关于使用本软件服务的协议。请您仔细阅读并充分理解本协议的全部内容。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">二、账号注册与使用</h3>
          <p className="mb-2">1. 您承诺以真实身份信息注册，并保证所提交的信息真实、准确、完整、合法有效。</p>
          <p className="mb-2">2. 您应当妥善保管账号及密码，对账号下的所有行为承担法律责任。</p>
          <p>3. 如发现账号异常，请立即联系我们。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">三、服务内容</h3>
          <p className="mb-2">有鱼记账为您提供以下服务：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>个人记账功能</li>
            <li>账单统计分析</li>
            <li>多账本管理</li>
            <li>数据云端同步</li>
            <li>会员增值服务</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">四、用户行为规范</h3>
          <p className="mb-2">您在使用本服务时须遵守法律法规，不得利用本服务从事违法违规行为，包括但不限于：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>发布、传播违法信息</li>
            <li>侵犯他人知识产权</li>
            <li>干扰、破坏服务正常运行</li>
            <li>未经授权访问他人账号</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">五、数据与隐私</h3>
          <p>我们重视您的隐私保护，具体隐私政策请参见《隐私政策》。您使用本服务即表示您同意我们按照隐私政策收集、使用您的信息。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">六、免责声明</h3>
          <p className="mb-2">1. 您理解并同意，使用本服务可能存在风险，包括但不限于数据丢失、服务中断等。</p>
          <p className="mb-2">2. 我们会尽力保障服务的安全性，但不对服务的绝对安全性作保证。</p>
          <p>3. 因不可抗力导致的服务中断，我们不承担责任。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">七、协议修改</h3>
          <p>我们保留随时修改本协议的权利。修改后的协议将在软件内公布，您继续使用即视为接受修改。</p>
        </section>

        <section>
          <h3 className="font-bold text-gray-900 mb-2">八、联系我们</h3>
          <p>如有任何问题，请联系我们：support@youyujizhang.com</p>
        </section>

        <div className="pt-6 text-center text-gray-400 text-xs">
          <p>最终解释权归有鱼记账所有</p>
        </div>
      </div>
    </div>
  );
}
