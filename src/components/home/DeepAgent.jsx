import { useState } from 'react'
import { motion } from 'framer-motion'
import { Boxes, Database, FileCode2, ArrowRight } from 'lucide-react'
import Section from '../common/Section.jsx'
import Reveal from '../common/Reveal.jsx'
import StatMeter from '../common/StatMeter.jsx'
import RiskBadge from '../common/RiskBadge.jsx'
import CodeBlock from '../common/CodeBlock.jsx'

const RULE_ATTACKS = ['reentrancy', 'access-control', 'unchecked-call', 'tx.origin']
const NOVEL_ATTACKS = ['cross-function reentrancy', 'oracle + flash-loan chain', 'delegatecall storage clobber']

const POCS = {
  foundry: `// test/Exploit.t.sol  (synthesised by the agent)
function test_drain() public {
    vm.prank(attacker);
    Attack a = new Attack(address(vault));
    a.pwn{value: 1 ether}();
    assertGt(attacker.balance, 1 ether);   // funds drained
}`,
  hardhat: `// test/exploit.js  (synthesised by the agent)
it("drains the vault", async () => {
  const attack = await Attack.deploy(vault.address);
  await attack.pwn({ value: parseEther("1") });
  expect(await ethers.provider.getBalance(attacker))
    .to.be.gt(parseEther("1"));  // funds drained
});`,
}

function Chip({ children, tone = 'med', delay = 0 }) {
  const cls = { med: 'border-steel text-steel', high: 'border-copper text-copper' }[tone]
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className={`inline-flex items-center gap-1.5 rounded-full border ${cls} bg-white/[0.015] px-3 py-1 font-mono text-[0.72rem]`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {children}
    </motion.span>
  )
}

export default function DeepAgent() {
  const [memory, setMemory] = useState('sqlite')
  const [poc, setPoc] = useState('foundry')

  return (
    <Section
      id="deep"
      num="02"
      kicker="The Deep agent"
      title="From known rules to invented attacks"
      intro="Hawk-i Deep runs an autonomous loop: it drains the known attack scripts, then an LLM planner invents novel attacks the ruleset never encoded, and the sandbox proves each one with a runnable proof-of-concept."
      width="wide"
    >
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        {/* campaign flow */}
        <Reveal className="lg:col-span-7">
          <div className="panel glass-panel rounded-2xl p-6 md:p-8 h-full">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-[#77746C] mb-6">
              <Boxes size={14} className="text-steel" /> attack campaign
            </div>

            <div className="space-y-7">
              <div>
                <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-grey mb-3">
                  Stage 1 &middot; known rule attacks
                </div>
                <div className="flex flex-wrap gap-2">
                  {RULE_ATTACKS.map((a, i) => (
                    <Chip key={a} tone="med" delay={i * 0.12}>
                      {a}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-[#5a5a5a]">
                <span className="h-px flex-1 bg-[#232323]" />
                <ArrowRight size={14} className="text-copper" />
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-copper">
                  LLM planner
                </span>
                <span className="h-px flex-1 bg-[#232323]" />
              </div>

              <div>
                <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-grey mb-3">
                  Stage 2 &middot; invented novel attacks
                </div>
                <div className="flex flex-wrap gap-2">
                  {NOVEL_ATTACKS.map((a, i) => (
                    <Chip key={a} tone="high" delay={0.5 + i * 0.15}>
                      {a}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* memory + budget */}
              <div className="grid sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-grey mb-3">
                    <Database size={13} className="text-steel" /> memory
                  </div>
                  <div className="inline-flex rounded-lg border border-[#242424] p-0.5">
                    {['sqlite', 'json'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMemory(m)}
                        className={`px-3 py-1 rounded-md font-mono text-xs transition ${
                          memory === m ? 'bg-[#687F97]/15 text-white' : 'text-[#7a7a7a] hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 font-mono text-[0.7rem] text-[#5f5f5f]">
                    {memory === 'sqlite' ? '~/.hawki/deep_memory.db' : '~/.hawki/deep_memory.jsonl'}
                  </p>
                </div>

                <div className="space-y-4">
                  <StatMeter label="attempts" value={7} max={20} tone="med" />
                  <StatMeter label="tokens" value={41000} max={120000} tone="high" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* outcome: PoC + finding */}
        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="panel glass-panel rounded-2xl p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-[#77746C]">
                <FileCode2 size={14} className="text-copper" /> proof-of-concept
              </div>
              <div className="inline-flex rounded-lg border border-[#242424] p-0.5">
                {['foundry', 'hardhat'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPoc(t)}
                    className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                      poc === t ? 'bg-[#986C67]/15 text-white' : 'text-[#7a7a7a] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <CodeBlock code={POCS[poc]} />

            <div className="mt-5 pt-5 border-t border-[#1c1c1c]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white font-medium text-sm">Cross-function reentrancy</span>
                <RiskBadge level="high" />
              </div>
              <p className="text-[#8a8a8a] text-sm mt-2 leading-relaxed">
                Not in any rule. The agent invented the attack path, wrote the exploit, and the sandbox
                confirmed a drain. Evidence, not a guess.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
