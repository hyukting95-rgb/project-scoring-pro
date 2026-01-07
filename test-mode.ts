// 测试模式配置
export const TEST_MODE = {
  enabled: false, // 设置为false来禁用测试模式
  mockUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    user_metadata: {
      display_name: '测试用户'
    }
  },
  mockData: {
    projects: [
      {
        id: 'PROJ001',
        type: '设计项目',
        content: '产品创新',
        score: 2.0,
        responsiblePerson: '张三',
        entryTime: '2024-01-15',
        status: '进行中' as const,
        rawSelections: {
          selectedDesignType: '产品创新' as any,
          selectedPackageType: null,
          selectedManualType: null,
          cmfValue: 0,
          cmfPerson: '',
          cmfpMode: 'additional' as const,
          cmfpPerson1: '',
          cmfpPerson2: '',
          mainCreator: '张三',
          isIndependent: 'yes' as const,
          baseScore: 2.0,
          selectedAddons: [],
          addonPersons: {},
          packagePerson: '',
          manualPerson: ''
        },
        scoringParts: [
          { label: '基础分', value: 2.0 }
        ],
        user_id: 'test-user-123'
      }
    ],
    personnel: [
      {
        id: 'PER001',
        person: '张三',
        projectId: 'PROJ001',
        score: 2.0,
        content: '产品创新',
        entryTime: '2024-01-15'
      }
    ]
  }
};

// 检查是否启用测试模式
export const isTestMode = () => TEST_MODE.enabled;