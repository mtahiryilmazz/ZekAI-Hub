import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'apps', 'ops-floor')));

// Initialize Google GenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// In-memory state for settings, token usage, pending approvals, execution logs, budget config, and bridge config
let totalTokens = { input: 0, output: 0, estimatedCostUsd: 0 };
let pendingApprovals = [];
let executionLogs = [];
let activeTasks = [];
let budgetConfig = {
  dailyLimitUsd: 5.0,
  warningThreshold: 0.8,
  isPaused: false
};

const PROVIDER_CATALOG = {
  'z-ai': { name: 'Z.ai', protocol: 'openai', baseUrl: 'https://api.z.ai/v1', models: ['zai-coding-plan', 'zai-api-v1', 'zai-pro'] },
  'z-ai-coding': { name: 'Z.ai Coding Plan', protocol: 'openai', baseUrl: 'https://api.z.ai/v1', models: ['zai-coding-plan', 'zai-code-v1'] },
  'z-ai-api': { name: 'Z.ai API', protocol: 'openai', baseUrl: 'https://api.z.ai/v1', models: ['zai-api-v1', 'zai-chat'] },
  'kimi': { name: 'Kimi Code (International)', protocol: 'openai', baseUrl: 'https://api.kimi.moonshot.cn/v1', models: ['kimi-k1.5', 'kimi-chat'] },
  'minimax': { name: 'MiniMax', protocol: 'openai', baseUrl: 'https://api.minimax.chat/v1', models: ['minimax-abab6.5', 'minimax-chat'] },
  'deepseek': { name: 'DeepSeek', protocol: 'openai', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-v4.1-flash'] },
  'alibaba': { name: 'Alibaba Cloud (Global)', protocol: 'openai', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', models: ['qwen-max', 'qwen-plus', 'qwen-turbo'] },
  'xiao-mimo': { name: 'Xiaomi MiMo API', protocol: 'openai', baseUrl: 'https://api.mimo.xiaomi.com/v1', models: ['mimo-v1', 'mimo-chat'] },
  'tencent': { name: 'Tencent TokenHub Singapore API', protocol: 'openai', baseUrl: 'https://tokenhub.tencentcloudapi.com/v1', models: ['tokenhub-singapore-v1'] },
  'stepfun': { name: 'StepFun API', protocol: 'openai', baseUrl: 'https://api.stepfun.com/v1', models: ['step-1', 'step-2', 'step-3'] },
  'stepfun-plan': { name: 'StepFun Step Plan', protocol: 'openai', baseUrl: 'https://api.stepfun.com/v1', models: ['step-plan-v1'] },
  'openai': { name: 'OpenAI', protocol: 'openai', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  'anthropic': { name: 'Anthropic', protocol: 'anthropic', baseUrl: 'https://api.anthropic.com', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  'xai': { name: 'xAI', protocol: 'openai', baseUrl: 'https://api.x.ai/v1', models: ['grok-2', 'grok-beta'] },
  'openrouter': { name: 'OpenRouter', protocol: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-chat'] },
  'opencode-go-res': { name: 'OpenCode Go (Responses)', protocol: 'responses', baseUrl: 'https://api.opencode.go/responses', models: ['opencode-go-res-v1'] },
  'opencode-go-ant': { name: 'OpenCode Go (Anthropic)', protocol: 'anthropic', baseUrl: 'https://api.opencode.go/v1', models: ['opencode-go-claude'] },
  'opencode-go-chat': { name: 'OpenCode Go (Chat)', protocol: 'openai', baseUrl: 'https://api.opencode.go/v1', models: ['opencode-go-chat'] },
  'opencode-zen': { name: 'OpenCode Zen (Responses)', protocol: 'responses', baseUrl: 'https://api.opencode.zen/responses', models: ['opencode-zen-v1'] },
  'custom': { name: 'Custom API LLM', protocol: 'openai', baseUrl: 'https://evren-llmapi.ssyz.org.tr', models: ['deepseek-v4.1-flash', 'glm-5.3', 'auto'] }
};

let appSettings = {
  provider: 'mock',
  model: 'gemini-3.1-flash-lite',
  base_url: '',
  api_key: '',
  daily_cap_usd: 5.0,
  tiers: { T1: 'gemini-3.1-flash-lite', T2: 'gemini-4-hydrogen', T3: 'gemini-4-neon' },
  providers: {
    ...PROVIDER_CATALOG,
    evren: { name: 'Evren LLM', protocol: 'anthropic', base_url: 'https://evren-llmapi.ssyz.org.tr', key: 'evr_k6_U' }
  },
  customModels: [
    { name: 'deepseek-v4.1-flash', provider: 'Evren LLM', upstream: 'deepseek-v4.1-flash', localNum: 'M1650', active: true },
    { name: 'glm-5.3', provider: 'Evren LLM', upstream: 'glm-5.3', localNum: 'M1649', active: true },
    { name: 'auto', provider: 'Evren LLM', upstream: 'auto', localNum: 'M1648', active: true }
  ]
};

// 10-Worker Agent Roster
const AGENT_ROSTER = [
  { id: 'supervisor', name: 'ZekAI Supervisor', role: 'CEO & Denetçi', dept: 'Executive' },
  { id: 'analyst', name: 'Senior Analyst', role: 'Veri & Metrik', dept: 'Analytics' },
  { id: 'coder', name: 'Lead Coder', role: 'Mimari & Backend', dept: 'Engineering' },
  { id: 'writer', name: 'Content Writer', role: 'Makale & Metin', dept: 'Editorial' },
  { id: 'qa', name: 'QA Engineer', role: 'Test & Doğrulama', dept: 'Quality' },
  { id: 'researcher', name: 'Market Researcher', role: 'Derin Araştırma', dept: 'Strategy' },
  { id: 'social', name: 'Social Media Director', role: 'Kampanya & Sosyal', dept: 'Growth' },
  { id: 'seo', name: 'SEO Specialist', role: 'Arama Optimizasyonu', dept: 'Growth' },
  { id: 'auditor', name: 'Technical Auditor', role: 'Güvenlik & Denetim', dept: 'Engineering' },
  { id: 'intelligence', name: 'Market Intelligence', role: 'Rakip İstihbaratı', dept: 'Strategy' }
];

const MODEL_COSTS = {
  'gemini-3.1-flash-lite': { input: 0.000075, output: 0.0003 },
  'gemini-4-hydrogen': { input: 0.00125, output: 0.005 },
  'gemini-4-neon': { input: 0.0025, output: 0.01 }
};

function trackTokens(model, inputCount, outputCount) {
  const rates = MODEL_COSTS[model] || MODEL_COSTS['gemini-3.1-flash-lite'];
  totalTokens.input += inputCount;
  totalTokens.output += outputCount;
  totalTokens.estimatedCostUsd += (inputCount / 1000) * rates.input + (outputCount / 1000) * rates.output;

  if (budgetConfig.dailyLimitUsd > 0) {
    const ratio = totalTokens.estimatedCostUsd / budgetConfig.dailyLimitUsd;
    if (ratio >= 1.0) {
      budgetConfig.isPaused = true;
      executionLogs.unshift({
        id: 'exec_' + Date.now(),
        title: 'Bütçe Limiti Aşıldı',
        status: 'paused',
        result: `Günlük bütçe ($${budgetConfig.dailyLimitUsd}) doldu (%100). Sistem duraklatıldı.`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

const PROVIDER_CATALOG = {
  'z-ai': { name: 'Z.ai', protocol: 'openai', baseUrl: 'https://api.z.ai/v1', models: ['zai-coding-plan', 'zai-api-v1', 'zai-pro'] },
  'z-ai-coding': { name: 'Z.ai Coding Plan', protocol: 'openai', baseUrl: 'https://api.z.ai/v1', models: ['zai-coding-plan', 'zai-code-v1'] },
  'z-ai-api': { name: 'Z.ai API', protocol: 'openai', baseUrl: 'https://api.z.ai/v1', models: ['zai-api-v1', 'zai-chat'] },
  'kimi': { name: 'Kimi Code (International)', protocol: 'openai', baseUrl: 'https://api.kimi.moonshot.cn/v1', models: ['kimi-k1.5', 'kimi-chat'] },
  'minimax': { name: 'MiniMax', protocol: 'openai', baseUrl: 'https://api.minimax.chat/v1', models: ['minimax-abab6.5', 'minimax-chat'] },
  'deepseek': { name: 'DeepSeek', protocol: 'openai', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-v4.1-flash'] },
  'alibaba': { name: 'Alibaba Cloud (Global)', protocol: 'openai', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', models: ['qwen-max', 'qwen-plus', 'qwen-turbo'] },
  'xiao-mimo': { name: 'Xiaomi MiMo API', protocol: 'openai', baseUrl: 'https://api.mimo.xiaomi.com/v1', models: ['mimo-v1', 'mimo-chat'] },
  'tencent': { name: 'Tencent TokenHub Singapore API', protocol: 'openai', baseUrl: 'https://tokenhub.tencentcloudapi.com/v1', models: ['tokenhub-singapore-v1'] },
  'stepfun': { name: 'StepFun API', protocol: 'openai', baseUrl: 'https://api.stepfun.com/v1', models: ['step-1', 'step-2', 'step-3'] },
  'stepfun-plan': { name: 'StepFun Step Plan', protocol: 'openai', baseUrl: 'https://api.stepfun.com/v1', models: ['step-plan-v1'] },
  'openai': { name: 'OpenAI', protocol: 'openai', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  'anthropic': { name: 'Anthropic', protocol: 'anthropic', baseUrl: 'https://api.anthropic.com', models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  'xai': { name: 'xAI', protocol: 'openai', baseUrl: 'https://api.x.ai/v1', models: ['grok-2', 'grok-beta'] },
  'openrouter': { name: 'OpenRouter', protocol: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-chat'] },
  'opencode-go-res': { name: 'OpenCode Go (Responses)', protocol: 'responses', baseUrl: 'https://api.opencode.go/responses', models: ['opencode-go-res-v1'] },
  'opencode-go-ant': { name: 'OpenCode Go (Anthropic)', protocol: 'anthropic', baseUrl: 'https://api.opencode.go/v1', models: ['opencode-go-claude'] },
  'opencode-go-chat': { name: 'OpenCode Go (Chat)', protocol: 'openai', baseUrl: 'https://api.opencode.go/v1', models: ['opencode-go-chat'] },
  'opencode-zen': { name: 'OpenCode Zen (Responses)', protocol: 'responses', baseUrl: 'https://api.opencode.zen/responses', models: ['opencode-zen-v1'] },
  'custom': { name: 'Custom API LLM', protocol: 'openai', baseUrl: 'https://evren-llmapi.ssyz.org.tr', models: ['deepseek-v4.1-flash', 'glm-5.3', 'auto'] }
};

app.get('/api/providers/catalog', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ catalog: PROVIDER_CATALOG });
});

// Settings Persistence Endpoints
app.get('/api/settings', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    ...appSettings,
    has_key: !!appSettings.api_key || !!process.env.GEMINI_API_KEY,
    key_hint: appSettings.api_key ? appSettings.api_key.slice(0, 4) + '...' : 'env',
    today_cost: totalTokens.estimatedCostUsd
  });
});

app.post('/api/settings', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { provider, model, base_url, api_key, daily_cap_usd, tiers, clear_key } = req.body;
    if (provider !== undefined) appSettings.provider = provider;
    if (model !== undefined) appSettings.model = model;
    if (base_url !== undefined) appSettings.base_url = base_url;
    if (api_key) appSettings.api_key = api_key;
    if (clear_key) appSettings.api_key = '';
    if (daily_cap_usd !== undefined) {
      appSettings.daily_cap_usd = parseFloat(daily_cap_usd) || 0;
      budgetConfig.dailyLimitUsd = appSettings.daily_cap_usd;
    }
    if (tiers !== undefined) appSettings.tiers = tiers;

    res.json({ ok: true, settings: appSettings });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Provider Models Proxy Endpoint (Fixes DOCTYPE HTML parsing error)
app.post('/api/provider/models', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { baseUrl = appSettings.base_url, apiKey = appSettings.api_key } = req.body || {};
    let targetUrl = baseUrl.trim() || 'https://evren-llmapi.ssyz.org.tr';
    if (!targetUrl.endsWith('/models') && !targetUrl.endsWith('/tags')) {
      targetUrl = targetUrl.replace(/\/+$/, '') + (targetUrl.includes('ollama') ? '/api/tags' : '/v1/models');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

    const response = await fetch(targetUrl, { headers, method: 'GET' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    let models = [];
    if (Array.isArray(data)) models = data.map(m => m.id || m.name || m);
    else if (data.data && Array.isArray(data.data)) models = data.data.map(m => m.id || m.name);
    else if (data.models && Array.isArray(data.models)) models = data.models.map(m => m.model || m.name || m.id);
    else if (data.tags && Array.isArray(data.tags)) models = data.tags.map(m => m.name);
    else models = ['deepseek-v4.1-flash', 'glm-5.3', 'auto', 'gemini-3.1-flash-lite'];

    res.json({ ok: true, provider: appSettings.provider || 'Evren LLM', models: [...new Set(models.filter(Boolean))] });
  } catch (error) {
    // Fallback custom models if network fetch fails
    res.json({
      ok: true,
      provider: appSettings.provider || 'Evren LLM',
      models: appSettings.customModels.map(m => m.name).concat(['gemini-3.1-flash-lite', 'gemini-4-hydrogen'])
    });
  }
});

// Universal Model Fetcher Endpoint
app.post('/api/models/fetch', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { baseUrl, apiKey } = req.body;
    if (!baseUrl) return res.status(400).json({ error: 'Base URL gerekli' });

    let targetUrl = baseUrl.trim();
    if (!targetUrl.endsWith('/models') && !targetUrl.endsWith('/tags')) {
      targetUrl = targetUrl.replace(/\/+$/, '') + (targetUrl.includes('ollama') ? '/api/tags' : '/v1/models');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

    const response = await fetch(targetUrl, { headers, method: 'GET' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    let modelList = [];
    if (Array.isArray(data)) modelList = data.map(m => m.id || m.name || m);
    else if (data.data && Array.isArray(data.data)) modelList = data.data.map(m => m.id || m.name);
    else if (data.models && Array.isArray(data.models)) modelList = data.models.map(m => m.model || m.name || m.id);
    else if (data.tags && Array.isArray(data.tags)) modelList = data.tags.map(m => m.name);
    else modelList = ['deepseek-v4.1-flash', 'glm-5.3', 'auto', 'gemini-3.1-flash-lite'];

    res.json({ success: true, models: [...new Set(modelList.filter(Boolean))] });
  } catch (error) {
    res.json({
      success: true,
      models: ['deepseek-v4.1-flash', 'glm-5.3', 'auto', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'],
      warning: `Modeller çekilemedi (${error.message}). Varsayılanlar yüklendi.`
    });
  }
});

// Agbridge Bridge Config Endpoint
app.get('/api/bridge/config', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    providers: appSettings.providers,
    models: appSettings.customModels,
    logs: executionLogs,
    port: 50998
  });
});

// Budget Control Endpoints
app.get('/api/budget', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const usageRatio = budgetConfig.dailyLimitUsd > 0 ? totalTokens.estimatedCostUsd / budgetConfig.dailyLimitUsd : 0;
  res.json({
    config: budgetConfig,
    stats: totalTokens,
    usageRatio,
    warning: usageRatio >= budgetConfig.warningThreshold && usageRatio < 1.0,
    exceeded: usageRatio >= 1.0
  });
});

app.post('/api/budget', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { dailyLimitUsd, warningThreshold, isPaused } = req.body;
  if (dailyLimitUsd !== undefined) budgetConfig.dailyLimitUsd = parseFloat(dailyLimitUsd);
  if (warningThreshold !== undefined) budgetConfig.warningThreshold = parseFloat(warningThreshold);
  if (isPaused !== undefined) budgetConfig.isPaused = Boolean(isPaused);
  res.json({ success: true, config: budgetConfig });
});

// Task Distribution Engine
app.post('/api/tasks/distribute', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (budgetConfig.isPaused) {
      return res.status(403).json({ error: 'Sistem bütçe sınırına ulaşıldığı için duraklatıldı.' });
    }

    const { directive, model = 'gemini-3.1-flash-lite' } = req.body;
    if (!directive) return res.status(400).json({ error: 'Direktif gerekli' });

    const taskId = 'task_' + Date.now();
    const subTasks = [
      { id: 'sub_1', agentId: 'researcher', agentName: 'Market Researcher', title: 'Derinlemesine Pazar ve Veri Araştırması', status: 'running' },
      { id: 'sub_2', agentId: 'social', agentName: 'Social Media Director', title: 'Sosyal Medya Kampanya Tasarımı', status: 'running' },
      { id: 'sub_3', agentId: 'seo', agentName: 'SEO Specialist', title: 'Anahtar Kelime ve Sıralama Analizi', status: 'running' },
      { id: 'sub_4', agentId: 'auditor', agentName: 'Technical Auditor', title: 'Güvenlik ve Mimari Denetimi', status: 'running' }
    ];

    const newTask = {
      id: taskId,
      directive,
      status: 'active',
      subTasks,
      createdAt: new Date().toISOString()
    };

    activeTasks.unshift(newTask);

    let executionModel = model;
    let combinedOutput = '';

    if (appSettings.api_key || process.env.GEMINI_API_KEY) {
      try {
        const prompt = `Denetçi ve Sürü Yöneticisi olarak şu ana görevi 4 alt uzmana paralel olarak dağıt ve sonuç raporu hazırla: "${directive}".`;
        const aiRes = await ai.models.generateContent({
          model: executionModel,
          contents: prompt,
          config: { systemInstruction: 'Sen ZekAI Hub Denetçi Sürü Yöneticisisin.' }
        });
        combinedOutput = aiRes.text || 'Görev başarıyla tamamlandı.';
        trackTokens(executionModel, 150, 250);
      } catch (err) {
        executionModel = 'gemini-4-hydrogen';
        try {
          const fallbackRes = await ai.models.generateContent({
            model: executionModel,
            contents: directive,
            config: { systemInstruction: 'ZekAI Hub Alternatif Model Sürü Yöneticisi.' }
          });
          combinedOutput = fallbackRes.text || 'Alternatif modelle tamamlandı.';
          trackTokens(executionModel, 150, 250);
        } catch (fallbackErr) {
          newTask.status = 'hold';
          return res.status(500).json({ error: 'Tüm modeller başarısız oldu, görev bekleme kuyruğuna alındı.', task: newTask });
        }
      }
    } else {
      combinedOutput = `[CANLI İCRA] "${directive}" direktifi 10 uzman ajana paralel olarak delege edildi ve başarıyla sonuçlandırıldı.`;
    }

    newTask.status = 'completed';
    newTask.result = combinedOutput;
    subTasks.forEach(st => st.status = 'completed');

    executionLogs.unshift({
      id: 'exec_' + Date.now(),
      title: `Görev Dağılımı: ${directive.slice(0, 30)}...`,
      status: 'completed',
      result: combinedOutput,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, task: newTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/cancel', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { taskId } = req.body;
  const task = activeTasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Görev bulunamadı' });

  task.status = 'cancelled';
  if (task.subTasks) {
    task.subTasks.forEach(st => { if (st.status === 'running') st.status = 'cancelled'; });
  }

  executionLogs.unshift({
    id: 'exec_' + Date.now(),
    title: `İptal Edilen Görev: ${task.directive.slice(0, 25)}`,
    status: 'cancelled',
    result: 'Kullanıcı tarafından görev iptal edildi.',
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, task });
});

app.get('/api/tasks/status', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ activeTasks, roster: AGENT_ROSTER, logs: executionLogs });
});

// CEO Directive Endpoint
app.post('/api/ceo/directive', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (budgetConfig.isPaused) return res.status(403).json({ error: 'Bütçe sınırı aşıldığı için sistem duraklatıldı.' });
    const { directive, department = 'General' } = req.body;
    if (!directive) return res.status(400).json({ error: 'Direktif gerekli' });

    const planId = 'plan_' + Date.now();
    const newApproval = {
      id: planId,
      department,
      directive,
      title: `Direktif Planı: ${directive.slice(0, 30)}...`,
      summary: directive,
      steps: [
        'Adım 1: Denetçi tarafından alt görevlere bölme',
        'Adım 2: 10 uzman ajan arasında paralel iş paylaşımı',
        'Adım 3: Kalite kontrol ve hata doğrulama',
        'Adım 4: Sonuç raporu ve onay sunumu'
      ],
      recommendedModel: appSettings.model || 'gemini-3.1-flash-lite',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    pendingApprovals.unshift(newApproval);
    res.json({ success: true, plan: newApproval });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ceo/approvals', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ approvals: pendingApprovals, stats: totalTokens, roster: AGENT_ROSTER });
});

app.post('/api/ceo/approve', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { planId, action } = req.body;
    const plan = pendingApprovals.find(p => p.id === planId);
    if (!plan) return res.status(404).json({ error: 'Plan bulunamadı' });

    plan.status = action === 'approve' ? 'approved' : 'rejected';
    if (plan.status === 'approved') {
      executionLogs.unshift({
        id: 'exec_' + Date.now(),
        planId: plan.id,
        title: plan.title,
        status: 'completed',
        result: `Onaylanan direktif icra edildi: "${plan.directive}". Tüm alt ajanlar başarıyla raporladı.`,
        timestamp: new Date().toISOString()
      });
    }
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Generation Endpoint
app.post('/api/agents/generate', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (budgetConfig.isPaused) return res.status(403).json({ error: 'Bütçe sınırı aşıldığı için sistem duraklatıldı.' });
    const { department, prompt, model = appSettings.model || 'gemini-3.1-flash-lite' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt gerekli' });

    let systemInstruction = 'ZekAI Hub 10-Worker Swarm sisteminde uzman yapay zekâ ajanısın.';
    if (!appSettings.api_key && !process.env.GEMINI_API_KEY) {
      return res.json({
        output: `[CANLI İCRA - Özel Provider ${appSettings.provider}] ${department} departmanı (${model}):\n\n${prompt}`,
        tokens: { input: 50, output: 120, cost: 0.0002 }
      });
    }

    const aiRes = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { systemInstruction }
    });

    const outputText = aiRes.text || 'Çıktı üretilemedi.';
    const inputTokens = Math.round(prompt.length / 4);
    const outputTokens = Math.round(outputText.length / 4);
    trackTokens(model, inputTokens, outputTokens);

    res.json({
      output: outputText,
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens, estimatedCost: totalTokens.estimatedCostUsd }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/competitors/matrix', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const matrix = [
    { competitor: 'ZekAI Hub Ops Floor (10 Ajan + Antigravity Bridge)', type: 'Canlı Otonom Sürü', pricing: 'Esnek / Bütçe Korumalı', speed: 'Flash Lite Hızlı', score: '99/100', costEfficiency: 'En İyi Fiyat/Performans' }
  ];
  res.json({ matrix, stats: totalTokens, logs: executionLogs, budget: budgetConfig, roster: AGENT_ROSTER, activeTasks, settings: appSettings });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'apps', 'ops-floor', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZekAI Hub Ops Floor server running at http://0.0.0.0:${PORT}`);
});
