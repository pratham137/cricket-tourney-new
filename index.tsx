import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const G = {
  card: {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'16px 20px'},
  btn: {background:'#1D9E75',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6} as any,
  ghost: {background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:500,cursor:'pointer'} as any,
  label: {fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500,display:'block',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'0.06em'},
}

function fmtOv(o:number,b:number){return `${o}.${b}`}
function runRate(r:number,o:number,b:number){const t=o+b/6;return t===0?'0.00':(r/t).toFixed(2)}
function rrr(need:number,ov:number){return ov<=0?'∞':(need/ov).toFixed(2)}

type Team={id:string;name:string;short_name:string;color:string}
type Player={id:string;team_id:string;name:string;role:string;is_captain:boolean;is_keeper:boolean;is_substitute:boolean}
type Match={id:string;label:string;team1_id:string;team2_id:string;match_date:string|null;overs:number;status:string;toss_winner_id:string|null;toss_choice:string|null;batting_first_id:string|null;current_innings:number;inn1_runs:number;inn1_wickets:number;inn1_overs:number;inn1_balls:number;inn2_runs:number;inn2_wickets:number;inn2_overs:number;inn2_balls:number;winner_id:string|null;win_margin:string|null;team1?:Team;team2?:Team}
type Ball={id:string;match_id:string;innings:number;over_number:number;ball_number:number;batsman_id:string|null;bowler_id:string|null;runs:number;is_wicket:boolean;dismissal_type:string|null;dismissed_player_id:string|null;extra_type:string|null;extra_runs:number;total_runs:number;batsman?:Player;bowler?:Player}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [tab, setTab] = useState<'live'|'fixtures'|'standings'|'teams'>('live')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [{ data: m }, { data: t }, { data: p }] = await Promise.all([
      sb.from('matches').select('*, team1:team1_id(*), team2:team2_id(*)').order('created_at'),
      sb.from('teams').select('*').order('name'),
      sb.from('players').select('*').order('name'),
    ])
    setMatches((m||[]) as Match[])
    setTeams((t||[]) as Team[])
    setPlayers((p||[]) as Player[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = sb.channel('home').on('postgres_changes',{event:'*',schema:'public',table:'matches'},load).on('postgres_changes',{event:'*',schema:'public',table:'balls'},load).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [load])

  const live = matches.filter(m => m.status==='innings1'||m.status==='innings2')
  const upcoming = matches.filter(m => m.status==='upcoming')
  const completed = matches.filter(m => m.status==='completed')

  function standings() {
    const map: Record<string,any> = {}
    teams.forEach(t => { map[t.id]={team:t,p:0,w:0,l:0,nr:0,pts:0,rf:0,ra:0,of_:0,oa:0} })
    completed.forEach(m => {
      const t1=map[m.team1_id],t2=map[m.team2_id]
      if(!t1||!t2) return
      t1.p++;t2.p++
      t1.rf+=m.inn1_runs;t1.of_+=m.inn1_overs+m.inn1_balls/6
      t2.rf+=m.inn2_runs;t2.of_+=m.inn2_overs+m.inn2_balls/6
      t1.ra+=m.inn2_runs;t1.oa+=m.inn2_overs+m.inn2_balls/6
      t2.ra+=m.inn1_runs;t2.oa+=m.inn1_overs+m.inn1_balls/6
      if(m.winner_id===m.team1_id){t1.w++;t1.pts+=2;t2.l++}
      else if(m.winner_id===m.team2_id){t2.w++;t2.pts+=2;t1.l++}
      else{t1.nr++;t2.nr++;t1.pts++;t2.pts++}
    })
    return Object.values(map).map((r:any)=>({...r,nrr:r.of_>0&&r.oa>0?r.rf/r.of_-r.ra/r.oa:0})).sort((a:any,b:any)=>b.pts-a.pts||b.nrr-a.nrr)
  }

  const tabStyle = (t:string) => ({
    padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'none',
    background: tab===t?'rgba(29,158,117,0.2)':'transparent',
    color: tab===t?'#1D9E75':'rgba(255,255,255,0.5)',
  })

  const statusBadge = (s:string) => {
    const isLive=s==='innings1'||s==='innings2'
    return <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,letterSpacing:'0.04em',background:isLive?'rgba(226,75,74,0.2)':s==='upcoming'?'rgba(239,159,39,0.15)':'rgba(255,255,255,0.06)',color:isLive?'#F09595':s==='upcoming'?'#FAC775':'rgba(255,255,255,0.4)',border:`1px solid ${isLive?'rgba(226,75,74,0.3)':s==='upcoming'?'rgba(239,159,39,0.25)':'rgba(255,255,255,0.08)'}`}}>
      {isLive?'🔴 Live':s==='upcoming'?'Upcoming':'Final'}
    </span>
  }

  return (
    <div style={{minHeight:'100vh',background:'#070d0a'}}>
      {/* Header */}
      <div style={{background:'rgba(0,0,0,0.6)',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(12px)'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:28}}>🏏</span>
            <div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:26,letterSpacing:'0.06em',lineHeight:1}}>TOURNAMENT HQ</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Live Cricket Tracker</div>
            </div>
          </div>
          <Link href="/admin"><span style={G.ghost}>Admin →</span></Link>
        </div>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 16px 8px',display:'flex',gap:2}}>
          {(['live','fixtures','standings','teams'] as const).map(t=>(
            <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>
              {t==='live'?`🔴 Live${live.length?` (${live.length})`:''}`:`${t.charAt(0).toUpperCase()}${t.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 16px'}}>
        {loading && <div style={{textAlign:'center',padding:'80px 0',color:'rgba(255,255,255,0.3)'}}>
          <div style={{fontSize:40,marginBottom:12}}>🏏</div>Loading...
        </div>}

        {!loading && tab==='live' && (
          <div>
            {live.map(m=><LiveCard key={m.id} match={m}/>)}
            {live.length===0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:14}}>No live matches right now</div>}
            {completed.slice(-3).reverse().map(m=><MatchCard key={m.id} match={m} badge={statusBadge(m.status)}/>)}
          </div>
        )}

        {!loading && tab==='fixtures' && (
          <div>{[...live,...upcoming,...completed].map(m=><MatchCard key={m.id} match={m} badge={statusBadge(m.status)}/>)}
          {matches.length===0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'60px 0'}}>No fixtures yet</div>}
          </div>
        )}

        {!loading && tab==='standings' && (
          <div style={{...G.card,padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                {['#','Team','P','W','L','NR','Pts','NRR'].map(h=>(
                  <th key={h} style={{padding:'12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.4)',textAlign:h==='Team'?'left':'center',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {standings().map((r:any,i:number)=>(
                  <tr key={r.team.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'12px',textAlign:'center',fontSize:16}}>{'🥇🥈🥉'.split('')[i]||i+1}</td>
                    <td style={{padding:'12px',fontWeight:600}}>
                      <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                        <span style={{width:10,height:10,borderRadius:'50%',background:r.team.color,display:'inline-block'}}/>
                        {r.team.name}
                      </span>
                    </td>
                    {[r.p,r.w,r.l,r.nr].map((v:number,j:number)=>(
                      <td key={j} style={{padding:'12px',textAlign:'center',fontSize:14,color:'rgba(255,255,255,0.6)'}}>{v}</td>
                    ))}
                    <td style={{padding:'12px',textAlign:'center',fontWeight:700,fontSize:15}}>{r.pts}</td>
                    <td style={{padding:'12px',textAlign:'center',fontSize:13,fontWeight:500,color:r.nrr>=0?'#1D9E75':'#E24B4A'}}>{r.nrr>=0?'+':''}{r.nrr.toFixed(3)}</td>
                  </tr>
                ))}
                {teams.length===0 && <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.3)'}}>No teams yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab==='teams' && (
          <div>
            {teams.map(t=>{
              const tp=players.filter(p=>p.team_id===t.id)
              return <div key={t.id} style={{...G.card,marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,paddingBottom:12,borderBottom:`2px solid ${t.color}`}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:t.color}}/>
                  <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:'0.05em'}}>{t.name}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{t.short_name} · {tp.filter(p=>!p.is_substitute).length} players</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:8}}>
                  {tp.map(p=>(
                    <div key={p.id} style={{background:'rgba(255,255,255,0.03)',borderLeft:`2px solid ${p.is_substitute?'rgba(255,255,255,0.1)':t.color}`,borderRadius:6,padding:'8px 10px',opacity:p.is_substitute?0.6:1}}>
                      <div style={{fontWeight:500,fontSize:13}}>{p.name}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:2}}>{p.role||'Player'}</div>
                      {p.is_captain&&<div style={{fontSize:10,color:'#FAC775',marginTop:2}}>★ Captain</div>}
                      {p.is_keeper&&<div style={{fontSize:10,color:'#85B7EB',marginTop:2}}>† Keeper</div>}
                      {p.is_substitute&&<div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2}}>Substitute</div>}
                    </div>
                  ))}
                </div>
              </div>
            })}
            {teams.length===0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'60px 0'}}>No teams yet</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function LiveCard({match:m}:{match:Match}) {
  const isInn2=m.current_innings===2
  const cr=isInn2?m.inn2_runs:m.inn1_runs,cw=isInn2?m.inn2_wickets:m.inn1_wickets
  const co=isInn2?m.inn2_overs:m.inn1_overs,cb=isInn2?m.inn2_balls:m.inn1_balls
  const target=isInn2?m.inn1_runs+1:null,need=target?target-m.inn2_runs:null
  const ovLeft=isInn2?(m.overs-m.inn2_overs-m.inn2_balls/6):null
  const batTeam=isInn2?(m.batting_first_id===m.team1_id?m.team2:m.team1):(m.batting_first_id===m.team1_id?m.team1:m.team2)
  return (
    <Link href={`/match/${m.id}`}>
      <div style={{...G.card,marginBottom:12,border:'1px solid rgba(226,75,74,0.3)',cursor:'pointer'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:'rgba(226,75,74,0.2)',color:'#F09595',border:'1px solid rgba(226,75,74,0.3)'}}>🔴 LIVE</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{m.label} · Inn {m.current_innings}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:4}}>{batTeam?.name} batting</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:52,lineHeight:1}}>{cr}/{cw}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:4}}>{fmtOv(co,cb)} ov · RR {runRate(cr,co,cb)}</div>
          </div>
          {isInn2&&target&&need!==null&&ovLeft!==null&&(
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:20,fontWeight:700,color:'#FAC775'}}>Need {need}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2}}>RRR {rrr(need,ovLeft)}</div>
            </div>
          )}
        </div>
        <div style={{fontSize:12,color:'#1D9E75',marginTop:10,fontWeight:500}}>View ball-by-ball →</div>
      </div>
    </Link>
  )
}

function MatchCard({match:m,badge}:{match:Match,badge:any}) {
  return (
    <Link href={`/match/${m.id}`}>
      <div style={{...G.card,marginBottom:8,cursor:'pointer'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.4)',fontWeight:500}}>{m.label}</span>
          {badge}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:600,fontSize:15}}>{(m.team1 as any)?.name}</div>
            {m.status!=='upcoming'&&<div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2}}>{m.inn1_runs}/{m.inn1_wickets} ({fmtOv(m.inn1_overs,m.inn1_balls)} ov)</div>}
          </div>
          <div style={{color:'rgba(255,255,255,0.3)',fontWeight:700}}>VS</div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:600,fontSize:15}}>{(m.team2 as any)?.name}</div>
            {m.status!=='upcoming'&&m.inn2_runs>0&&<div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2}}>{m.inn2_runs}/{m.inn2_wickets} ({fmtOv(m.inn2_overs,m.inn2_balls)} ov)</div>}
          </div>
        </div>
        {m.status==='completed'&&m.winner_id&&(
          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:12,color:'#1D9E75',fontWeight:500}}>
            🏆 {m.winner_id===m.team1_id?(m.team1 as any)?.name:(m.team2 as any)?.name} won · {m.win_margin}
          </div>
        )}
      </div>
    </Link>
  )
}
