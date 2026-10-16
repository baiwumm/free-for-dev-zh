import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractLinks, extractNumbers, validateTranslation } from '../scripts/lib/validate.mjs'
import { parseModelJson } from '../scripts/translate.mjs'

test('数字归一化：5 million 与 500 万 等值', () => {
  assert.deepEqual(extractNumbers('5 million tokens'), ['5000000'])
  assert.deepEqual(extractNumbers('500 万 tokens'), ['5000000'])
})

test('数字归一化：千分位与全角数字', () => {
  assert.deepEqual(extractNumbers('1,000 requests'), ['1000'])
  assert.deepEqual(extractNumbers('１０００ requests'), ['1000'])
})

test('数字归一化：欧式千分位 3.000 与 3,000 等值', () => {
  assert.deepEqual(extractNumbers('3.000 build minutes'), ['3000'])
  assert.deepEqual(extractNumbers('3,000 build minutes'), ['3000'])
  assert.deepEqual(extractNumbers('1.000.000 events'), ['1000000'])
  assert.deepEqual(
    validateTranslation('Run 3.000 build minutes free', '免费运行 3,000 构建分钟'),
    [],
  )
})

test('校验通过：极短描述豁免长度比', () => {
  assert.deepEqual(validateTranslation('Compute', '计算'), [])
  assert.deepEqual(validateTranslation('Online Surveys', '在线调查'), [])
})

test('数字归一化：英文数词与空格千分位', () => {
  assert.deepEqual(extractNumbers('nine backend hours'), ['9'])
  assert.deepEqual(extractNumbers('five hundred monthly builds'), ['500'])
  assert.deepEqual(extractNumbers('seven billion images'), ['7000000000'])
  assert.deepEqual(extractNumbers('10, 000 rows'), ['10000'])
  assert.deepEqual(extractNumbers('twenty-four hours'), ['24'])
  assert.deepEqual(extractNumbers('3rd-party services'), [])
})

test('数字校验：小数（≤12）允许中文数量表达，大数严格一致', () => {
  assert.deepEqual(
    validateTranslation(
      'Gigalixir provides one free instance with 2 connections and 10, 000 rows',
      'Gigalixir 提供一台免费实例、2 个连接和 10,000 行数据',
    ),
    [],
  )
  assert.ok(
    validateTranslation('Free 100 GB storage', '免费存储额度充足').some((i) =>
      i.includes('数字不一致'),
    ),
  )
})

test('数字归一化：单位字母后接字母不放大（ms/MB/GB）', () => {
  assert.deepEqual(extractNumbers('0.5GB'), ['0.5'])
  assert.deepEqual(extractNumbers('0.5 GB'), ['0.5'])
  assert.deepEqual(extractNumbers('100ms'), ['100'])
  assert.deepEqual(extractNumbers('500MB'), ['500'])
})

test('数字归一化：4K 与 4000 等值', () => {
  assert.deepEqual(extractNumbers('4K video'), ['4000'])
  assert.deepEqual(extractNumbers('4K 视频'), ['4000'])
})

test('链接集合提取', () => {
  assert.deepEqual(extractLinks('见 [文档](https://a.dev/x) 和 [FAQ](https://b.dev/)'), [
    'https://a.dev/x',
    'https://b.dev/',
  ])
})

test('校验通过：数字/链接/长度均等值', () => {
  const en = 'Free 5 million tokens per month, see [docs](https://a.dev/x).'
  const zh = '每月免费 500 万 tokens，见 [docs](https://a.dev/x)。'
  assert.deepEqual(validateTranslation(en, zh), [])
})

test('校验失败：数字不一致', () => {
  const issues = validateTranslation('Free 100 GB storage', '免费 99 GB 存储')
  assert.ok(issues.some((i) => i.includes('数字不一致')))
})

test('校验失败：链接丢失', () => {
  const issues = validateTranslation('See [docs](https://a.dev/x) for details', '详见文档了解详情')
  assert.ok(issues.some((i) => i.includes('链接不一致')))
})

test('校验失败：空译文与拒答', () => {
  assert.deepEqual(validateTranslation('hello', ''), ['译文为空'])
  assert.ok(
    validateTranslation('hello world this is a test', '抱歉，我无法翻译').some((i) =>
      i.includes('拒答'),
    ),
  )
})

test('校验失败：长度比异常', () => {
  const en = 'This is a fairly long English description that goes on and on for quite a while.'
  const issues = validateTranslation(en, '太短')
  assert.ok(issues.some((i) => i.includes('长度比异常')))
})

test('服务名校验：品牌特征名必须保留（大小写不敏感），通用词名不强制', () => {
  const en = 'Revolt.io is an open source user-first chat platform.'
  assert.ok(
    validateTranslation(en, '一个开源、以用户为先的聊天平台。', { name: 'Revolt.io' }).some((i) =>
      i.includes('服务名缺失'),
    ),
  )
  assert.deepEqual(
    validateTranslation(en, 'REVOLT.IO 是一个开源、以用户为先的聊天平台。', { name: 'Revolt.io' }),
    [],
  )
  assert.deepEqual(validateTranslation('Online Surveys', '在线调查', { name: 'Surveys' }), [])
})

test('parseModelJson：围栏与杂讯容错', () => {
  assert.equal(
    parseModelJson('```json\n{"translations":[{"id":"0","zh":"你好"}]}\n```')?.translations?.[0]
      ?.zh,
    '你好',
  )
  assert.deepEqual(parseModelJson('好的：{"translations":[]} 完毕')?.translations, [])
  assert.equal(parseModelJson('不是 JSON'), null)
})
