/**
 * stVault 模块工具函数单元测试
 *
 * 测试 dashboardCard.tsx 和各 form 组件中的纯函数：
 * - formatAddress: 地址截断格式化
 * - ethAddressToWithdrawalCredentials: ETH 地址转换为提款凭证
 * - formatWeiToEth: Wei 转 ETH（4 位小数）
 * - formatWeiToEthFull: Wei 转 ETH（完整精度）
 * - formatHealthFactor: 健康因子格式化
 * - getUserImage: 基于地址 hash 生成用户头像
 */

import { formatEther } from 'viem'

// ---- 从源码中提取的纯函数，保持与源码一致 ----

const formatAddress = (address: string) => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}....${address.slice(-4)}`;
}

function ethAddressToWithdrawalCredentials(ethAddress: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(ethAddress)) {
    throw new Error("invalid eth address");
  }
  return (
    "0x02" +
    "0000000000000000000000" +
    ethAddress.slice(2).toLowerCase()
  );
}

const formatWeiToEthFull = (wei: string) => {
  if (!wei || wei === '0') return '0';
  return formatEther(BigInt(wei));
}

const formatWeiToEth = (wei: string) => {
  const eth = formatWeiToEthFull(wei);
  const arr = eth.split('.');
  if (arr.length > 1) {
    return arr[0] + '.' + arr[1].substring(0, 4);
  }
  return eth;
}

const formatHealthFactor = (healthFactor: string) => {
  if (healthFactor === 'Infinity') return '∞ %';
  const num = parseFloat(healthFactor);
  return `${Math.round(num)}%`;
}

const getUserImage = (address: string) => {
  if (!address) return 'image0';
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % 4;
  const images = ['image0', 'image1', 'image2', 'image3'];
  return images[index];
}

// ---- isValidAmount 逻辑提取 ----

const isValidAmount = (amount: string, maxValue: string) => {
  if (!amount || amount.trim() === '') return false
  const trimmedAmount = amount.trim()
  if (trimmedAmount.startsWith('0') && !trimmedAmount.startsWith('0.')) return false
  const amountNum = parseFloat(trimmedAmount)
  if (isNaN(amountNum) || amountNum <= 0) return false
  const maxNum = parseFloat(maxValue)
  if (amountNum > maxNum) return false
  return true
}

// ---- 测试 ----

describe('formatAddress', () => {
  it('应返回空字符串当输入为空', () => {
    expect(formatAddress('')).toBe('');
  })

  it('应返回原始地址当长度 <= 10', () => {
    expect(formatAddress('0x1234')).toBe('0x1234');
    expect(formatAddress('0x12345678')).toBe('0x12345678');
  })

  it('应截断长地址，保留前6和后4字符', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(formatAddress(addr)).toBe('0x1234....5678');
  })

  it('应正确处理 42 字符标准 ETH 地址', () => {
    const addr = '0xABCDEF1234567890abcdef1234567890ABCDEF12';
    const result = formatAddress(addr);
    expect(result).toBe('0xABCD....EF12');
    expect(result.length).toBe(14); // 6 + 4(dots) + 4
  })
})

describe('ethAddressToWithdrawalCredentials', () => {
  it('应正确转换有效 ETH 地址', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = ethAddressToWithdrawalCredentials(addr);
    expect(result).toBe('0x0200000000000000000000001234567890abcdef1234567890abcdef12345678');
    expect(result.startsWith('0x02')).toBe(true);
  })

  it('应将大写地址转换为小写', () => {
    const addr = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
    const result = ethAddressToWithdrawalCredentials(addr);
    expect(result).toContain('abcdef1234567890abcdef1234567890abcdef12');
  })

  it('应拒绝无效地址格式', () => {
    expect(() => ethAddressToWithdrawalCredentials('invalid')).toThrow('invalid eth address');
    expect(() => ethAddressToWithdrawalCredentials('0x123')).toThrow('invalid eth address');
    expect(() => ethAddressToWithdrawalCredentials('1234567890abcdef1234567890abcdef12345678')).toThrow('invalid eth address');
  })

  it('应拒绝包含非 hex 字符的地址', () => {
    expect(() => ethAddressToWithdrawalCredentials('0xGGGGGG1234567890abcdef1234567890abcdef12')).toThrow('invalid eth address');
  })

  it('返回值长度应为 66', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = ethAddressToWithdrawalCredentials(addr);
    // "0x02" (4) + "0000000000000000000000" (22) + address without 0x (40) = 66
    expect(result.length).toBe(66);
  })
})

describe('formatWeiToEthFull', () => {
  it('应返回 "0" 当 wei 为空字符串', () => {
    expect(formatWeiToEthFull('')).toBe('0');
  })

  it('应返回 "0" 当 wei 为 "0"', () => {
    expect(formatWeiToEthFull('0')).toBe('0');
  })

  it('应正确转换 1 ETH (10^18 wei)', () => {
    expect(formatWeiToEthFull('1000000000000000000')).toBe('1');
  })

  it('应正确转换 0.5 ETH', () => {
    expect(formatWeiToEthFull('500000000000000000')).toBe('0.5');
  })

  it('应正确转换 32 ETH', () => {
    expect(formatWeiToEthFull('32000000000000000000')).toBe('32');
  })

  it('应保留完整小数精度', () => {
    const result = formatWeiToEthFull('1234567890123456789');
    expect(result).toBe('1.234567890123456789');
  })

  it('应返回 "0" 当 wei 为 undefined/null', () => {
    expect(formatWeiToEthFull(undefined as any)).toBe('0');
    expect(formatWeiToEthFull(null as any)).toBe('0');
  })
})

describe('formatWeiToEth', () => {
  it('应返回 "0" 当 wei 为空', () => {
    expect(formatWeiToEth('')).toBe('0');
    expect(formatWeiToEth('0')).toBe('0');
  })

  it('应将小数截断为 4 位', () => {
    const result = formatWeiToEth('1234567890123456789');
    expect(result).toBe('1.2345');
  })

  it('应正确处理整数 ETH', () => {
    expect(formatWeiToEth('1000000000000000000')).toBe('1');
  })

  it('应保留 4 位小数', () => {
    expect(formatWeiToEth('500000000000000000')).toBe('0.5');
  })

  it('应正确处理很小的值', () => {
    const result = formatWeiToEth('100000000000000'); // 0.0001 ETH
    expect(result).toBe('0.0001');
  })
})

describe('formatHealthFactor', () => {
  it('应返回 ∞ % 当值为 Infinity', () => {
    expect(formatHealthFactor('Infinity')).toBe('∞ %');
  })

  it('应将数值四舍五入为整数百分比', () => {
    expect(formatHealthFactor('150.5')).toBe('151%');
    expect(formatHealthFactor('200')).toBe('200%');
    expect(formatHealthFactor('99.4')).toBe('99%');
  })

  it('应处理小数', () => {
    expect(formatHealthFactor('0.5')).toBe('1%');
    expect(formatHealthFactor('0.4')).toBe('0%');
  })
})

describe('getUserImage', () => {
  it('应返回默认图片当地址为空', () => {
    expect(getUserImage('')).toBe('image0');
  })

  it('应返回 0-3 范围内的图片索引', () => {
    const images = ['image0', 'image1', 'image2', 'image3'];
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = getUserImage(addr);
    expect(images).toContain(result);
  })

  it('相同地址应始终返回相同图片', () => {
    const addr = '0xABCDEF1234567890abcdef1234567890ABCDEF12';
    const result1 = getUserImage(addr);
    const result2 = getUserImage(addr);
    expect(result1).toBe(result2);
  })

  it('不同地址应可能返回不同图片', () => {
    const results = new Set();
    const addresses = [
      '0xABCDEF1234567890abcdef1234567890ABCDEF12',
      '0x1234567890ABCDEF1234567890abcdef12345678',
      '0xdeadbeef00000000000000000000000000000001',
      '0xcafebabe00000000000000000000000000000002',
      '0x0000000000000000000000000000000000000003',
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      '0x9876543210fedcba9876543210fedcba98765432',
    ];
    addresses.forEach(addr => results.add(getUserImage(addr)));
    // 不同的地址 hash 应至少产生 2 种不同的图片
    expect(results.size).toBeGreaterThanOrEqual(2);
  })
})

describe('isValidAmount', () => {
  const maxValue = '10';

  it('应拒绝空字符串', () => {
    expect(isValidAmount('', maxValue)).toBe(false);
    expect(isValidAmount('  ', maxValue)).toBe(false);
  })

  it('应拒绝以 0 开头但不是 0. 的数字', () => {
    expect(isValidAmount('01', maxValue)).toBe(false);
    expect(isValidAmount('00', maxValue)).toBe(false);
    expect(isValidAmount('0123', maxValue)).toBe(false);
  })

  it('应接受 0. 开头的数字', () => {
    expect(isValidAmount('0.5', maxValue)).toBe(true);
    expect(isValidAmount('0.001', maxValue)).toBe(true);
  })

  it('应拒绝 0 或负数', () => {
    expect(isValidAmount('0', maxValue)).toBe(false);
    expect(isValidAmount('-1', maxValue)).toBe(false);
    expect(isValidAmount('0.0', maxValue)).toBe(false);
  })

  it('应拒绝超过最大值的金额', () => {
    expect(isValidAmount('11', maxValue)).toBe(false);
    expect(isValidAmount('100', maxValue)).toBe(false);
  })

  it('应接受有效金额', () => {
    expect(isValidAmount('1', maxValue)).toBe(true);
    expect(isValidAmount('5.5', maxValue)).toBe(true);
    expect(isValidAmount('10', maxValue)).toBe(true);
  })

  it('应拒绝 NaN', () => {
    expect(isValidAmount('abc', maxValue)).toBe(false);
    expect(isValidAmount('NaN', maxValue)).toBe(false);
  })

  it('最大值为 0 时应拒绝所有正数', () => {
    expect(isValidAmount('0.001', '0')).toBe(false);
    expect(isValidAmount('1', '0')).toBe(false);
  })
})

describe('stakingApr 格式化逻辑', () => {
  const formatStakingApr = (staking_apr: number) => {
    return staking_apr ? `${staking_apr > 0 ? '+' : ''}${staking_apr.toFixed(2)}%` : '0%';
  }

  it('应格式化正 APR 带 + 号', () => {
    expect(formatStakingApr(3.45)).toBe('+3.45%');
    expect(formatStakingApr(0.01)).toBe('+0.01%');
  })

  it('应格式化负 APR 不带 + 号', () => {
    expect(formatStakingApr(-2.5)).toBe('-2.50%');
  })

  it('应返回 0% 当 APR 为 0', () => {
    expect(formatStakingApr(0)).toBe('0%');
  })

  it('应保留 2 位小数', () => {
    expect(formatStakingApr(3.456789)).toBe('+3.46%');
  })
})
