import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nodeCenter, parseUi, screenState } from '../app/services/mylight_screen.js'

const pkg = 'com.mylightsystems.mira'
test('recognizes real dashboard accessibility labels and XML entities', () => {
  const nodes = parseUi(
    `<hierarchy><node package="${pkg}" content-desc="Batterie virtuelle&#10;40%" bounds="[32,1326][1049,1773]" /></hierarchy>`
  )
  assert.equal(nodes[0]['content-desc'], 'Batterie virtuelle\n40%')
  assert.equal(screenState(nodes, pkg), 'connected')
  assert.deepEqual(nodeCenter(nodes[0]), { x: 540, y: 1549 })
})
test('recognizes welcome and browser login screens', () => {
  assert.equal(
    screenState([{ 'package': pkg, 'content-desc': 'Accéder à mon compte' }], pkg),
    'disconnected'
  )
  assert.equal(
    screenState(
      ['signInName', 'password', 'next'].map((id) => ({ 'resource-id': id })),
      pkg
    ),
    'disconnected'
  )
})
test('does not treat unrelated screens, partial forms or another app as connected', () => {
  assert.equal(
    screenState([{ 'package': 'other', 'content-desc': 'Batterie virtuelle' }], pkg),
    'unknown'
  )
  assert.equal(screenState([{ 'resource-id': 'password' }], pkg), 'unknown')
  assert.equal(screenState([], pkg), 'unknown')
  assert.throws(() => parseUi('ERROR: could not get idle state'))
  assert.throws(() => nodeCenter({ bounds: '[0,0][0,0]' }))
})
