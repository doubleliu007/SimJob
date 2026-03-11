import type { RoleType } from '@/types'

export interface RoleConfig {
  type: RoleType
  label: string
  minCount: number
  maxCount: number
  priority: number
  avatars: string[]
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    type: 'general_manager',
    label: '总经理',
    minCount: 1,
    maxCount: 1,
    priority: 1,
    avatars: ['👔'],
  },
  {
    type: 'hr',
    label: 'HR',
    minCount: 2,
    maxCount: 2,
    priority: 2,
    avatars: ['📋', '🤝'],
  },
  {
    type: 'dept_head',
    label: '部门主管',
    minCount: 2,
    maxCount: 2,
    priority: 3,
    avatars: ['💼', '📈'],
  },
]

export const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '赵', '黄',
  '周', '吴', '徐', '孙', '胡', '朱', '高', '林',
  '何', '郭', '马', '罗', '梁', '宋', '郑', '谢',
  '韩', '唐', '冯', '于', '董', '萧', '程', '曹',
]
