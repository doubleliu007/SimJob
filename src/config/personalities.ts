import type { PersonalityType } from '@/types'

export interface PersonalityConfig {
  type: PersonalityType
  label: string
  description: string
  color: string
}

export const PERSONALITY_CONFIGS: PersonalityConfig[] = [
  {
    type: 'gentle',
    label: '温柔的',
    description: '天生共情力强，说话永远轻声细语，像怕惊到谁似的。习惯性地先肯定别人再表达自己的想法，即便内心不认同也会绕很大一个弯子。朋友圈里的"好好先生/小姐"，谁都不忍心让他/她难过。口头禅是"其实也挺好的""换个角度想嘛"。',
    color: '#10b981',
  },
  {
    type: 'cold',
    label: '冷漠的',
    description: '面部表情管理大师，永远一副"与我无关"的样子。不闲聊、不寒暄，开口就直奔主题，关掉的比打开的话多。相信逻辑和事实，觉得情绪是最没用的东西。不是故意冷，只是真的觉得大多数事情没什么值得激动的。',
    color: '#6b7280',
  },
  {
    type: 'passionate',
    label: '热爱事业的',
    description: '眼里永远有光的那种人，聊起自己在做的事会不自觉加快语速。凌晨两点还在回消息，周末也闲不住。对"差不多就行"这种话过敏，坚信把一件事做到极致才对得起时间。感染力极强，跟他/她待久了你也会觉得世界充满可能性。',
    color: '#f59e0b',
  },
  {
    type: 'slacker',
    label: '摸鱼的',
    description: '能坐着绝不站着，能一句话说完绝不说两句。手机永远比正事有吸引力，注意力漂移是常态。嘴边总挂着"差不多得了""行吧行吧""没那么重要"。但别被他/她的懒散骗了——真正上心的时候，冒出来的洞察力比谁都精准。',
    color: '#8b5cf6',
  },
  {
    type: 'manic',
    label: '狂躁的',
    description: '一个行走的感叹号。情绪来得快去得也快，上一秒拍桌子下一秒就笑了。说话永远是全场最大声的那个，肢体动作夸张到旁边的人得躲着点。做决定全凭当下感觉，冲动是常态，冷静才是意外。让人又爱又怕，永远不知道下一秒会发生什么。',
    color: '#ef4444',
  },
  {
    type: 'sycophant',
    label: '阿谀奉承的',
    description: '人群中的风向标，永远第一时间判断谁是"最重要的人"然后贴上去。笑容随时准备好，附和的话张口就来。如果在场的大人物意见相左，你能看到他/她脸上精彩的纠结表演。不是没有主见，只是主见永远让位于"正确的站队"。',
    color: '#ec4899',
  },
  {
    type: 'sarcastic',
    label: '尖酸刻薄的',
    description: '一张嘴能把人噎到说不出话。擅长阴阳怪气，每句话都像裹了层刺，表面在夸你实际在损你。观察力惊人，总能精准找到别人的软肋。但如果你扛住了他/她的毒舌，会发现背后藏着真正犀利的头脑和偶尔流露的真心。',
    color: '#14b8a6',
  },
]

export const PERSONALITY_MAP = new Map(
  PERSONALITY_CONFIGS.map((p) => [p.type, p])
)
