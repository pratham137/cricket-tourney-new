import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Team={id:string;name:string;short_name:string;color:string}
type Player={id:string;team_id:string;name:string;role:string;is_captain:boolean;is_keeper:boolean;is_substitute:boolean}
type Match={id:string;label:string;team1_id:string;team2_id:string;overs:number;status:string;batting_first_id:string|null;toss_winner_id:string|null;toss_choice:string|null;current_innings:number;inn1_runs:number;inn1_wickets:number;inn1_overs:number;inn1_balls:number;inn2_runs:number;inn2_wickets:number;inn2_overs:number;inn2_balls:number;winner_id:string|null;win_margin:string|null;match_date:string|null;team1?:Team;team2?:Team}
type Ball={id:string;innings:number;over_number:number;ball_number:number;runs:number;is_wicket:boolean;dismissal_type:string|null;extra_type:string|null;total_runs:number;batsman?:Player;bowler?:Player;dismissed_player_id:string|null}

function fmtOv(o:number,b:number){return `${o}.${b}`}
function rr(r:number,o:number,b:number){const t=o+b/6;return t===0?'0.00':(r/t).toFixed(2)}

export default function MatchPage() {
  const router=useRouter()
  const {id}=router.query
  const [match,setMatch]=useState<Match|null>(null)
  const [balls,setBalls]=useState<Ball[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [tab,setTab]=useState<'scorecard'|'overs'|'info'>('scorecard')
  const [loading,setLoading]=useState(true)

  const load=useCallback(async()=>{
    if(!id) return
    const [{data:m},{data:b}]=await Promise.all([
      sb.from('matches').select('*, team1:team1_id(*), team2:team2_id(*)').eq('id',id).single(),
      sb.from('balls').select('*, batsman:batsman_id(*), bowler:bowler_id(*)').eq('match_id',id).order('innings').order('over_number').order('ball_number'),
    ])
    if(m){
      setMatch(m as Match)
      const {data:p}=await sb.from('players').select('*').in('team_id',[(m as any).team1_id,(m as any).team2_id])
      setPlayers((p||[]) as Player[])
    }
    setBalls((b||[]) as Ball[])
    setLoading(false)
  },[id])

  useEffect(()=>{
    load()
    if(!id) return
    const ch=sb.channel(`match-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'matches',filter:`id=eq.${id}`},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'balls',filter:`match_id=eq.${id}`},load)
      .subscribe()
    return ()=>{ sb.removeChannel(ch) }
  },[id,load])

  if(loading) return <div style={{minHeight:'100vh',background:'#070d0a',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.4)'}}>Loading match...</div>
  if(!match) return <div style={{minHeight:'100vh',background:'#070d0a',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.4)'}}>Match not found. <Link href="/" style={{color:'#1D9E75',marginLeft:8}}>Go back</Link></div>

  const isLive=match.status==='innings1'||match.status==='innings2'
  const isInn2=match.current_innings===2
  const batFirstTeam=match.batting_first_id===match.team1_id?match.team1:match.team2
  const batSecondTeam=batFirstTeam?.id===match.team1?.id?match.team2:match.team1
  const cr=isInn2?match.inn2_runs:match.inn1_runs,cw=isInn2?match.inn2_wickets:match.inn1_wickets
  const co=isInn2?match.inn2_overs:match.inn1_overs,cb=isInn2?match.inn2_balls:match.inn1_balls
  const target=isInn2?match.inn1_runs+1:null,need=target?target-match.inn2_runs:null
  const ovLeft=isInn2?(match.overs-match.inn2_overs-match.inn2_balls/6):null
  const inn1Balls=balls.filter(b=>b.innings===1),inn2Balls=balls.filter(b=>b.innings===2)

  function groupOvers(bs:Ball[]){
    const map:Record<number,Ball[]>={}
    bs.forEach(b=>{if(!map[b.over_number])map[b.over_number]=[];map[b.over_number].push(b)})
    return Object.values(map)
  }
  function batStats(bs:Ball[]){
    const s:Record<string,any>={}
    bs.forEach(b=>{
      if(!b.batsman) return
      const pid=(b as any).batsman_id
      if(!s[pid])s[pid]={name:b.batsman.name,r:0,bl:0,fours:0,sixes:0,out:false,how:''}
      if(!b.extra_type||b.extra_type==='bye'||b.extra_type==='legbye')s[pid].bl++
      s[pid].r+=b.runs
      if(b.runs===4)s[pid].fours++
      if(b.runs===6)s[pid].sixes++
      if(b.is_wicket&&b.dismissed_player_id===pid){s[pid].out=true;s[pid].how=b.dismissal_type||'out'}
    })
    return Object.values(s)
  }
  function bowlStats(bs:Ball[]){
    const s:Record<string,any>={}
    bs.forEach(b=>{
      if(!b.bowler) return
      const pid=(b as any).bowler_id
      if(!s[pid])s[pid]={name:b.bowler.name,bl:0,r:0,w:0}
      if(!b.extra_type||b.extra_type==='bye'||b.extra_type==='legbye')s[pid].bl++
      s[pid].r+=b.total_runs
      if(b.is_wicket)s[pid].w++
    })
    return Object.values(s)
  }
  function dotLabel(b:Ball){
    if(b.extra_type){const el=b.extra_type==='wide'?'Wd':b.extra_type==='noball'?'Nb':b.extra_type==='bye'?'B':'Lb';return el+(b.total_runs>0?b.total_runs:'')}
    if(b.is_wicket) return 'W'
    return b.runs===0?'·':String(b.runs)
  }
  function dotColor(b:Ball){
    if(b.is_wicket) return '#E24B4A'
    if(b.extra_type) return '#A64DD1'
    if(b.runs===6) return '#EF9F27'
    if(b.runs===4) return '#378ADD'
    if(b.runs>0) return '#1D9E75'
    return 'rgba(255,255,255,0.25)'
  }

  const tabStyle=(t:string)=>({padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:tab===t?'rgba(29,158,117,0.2)':'transparent',color:tab===t?'#1D9E75':'rgba(255,255,255,0.5)'})
  const card={background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12}

  function ScorecardInnings({bs,inn,batTeam}:{bs:Ball[];inn:number;batTeam:Team|undefined}){
    const runs=inn===1?match.inn1_runs:match.inn2_runs,wkts=inn===1?match.inn1_wickets:match.inn2_wickets
    const ovs=inn===1?match.inn1_overs:match.inn2_overs,bls=inn===1?match.inn1_balls:match.inn2_balls
    if(bs.length===0&&(inn===2&&match.current_innings===1)) return null
    return (
      <div style={{marginBottom:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,letterSpacing:'0.04em',color:'rgba(255,255,255,0.8)'}}>{batTeam?.name} Innings {inn}</div>
          <div style={{fontSize:20,fontWeight:700}}>{runs}/{wkts} <span style={{fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.4)'}}>({fmtOv(ovs,bls)} ov)</span></div>
        </div>
        <div style={{...card,overflow:'hidden',marginBottom:12}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              {['Batsman','R','B','4s','6s','SR'].map(h=><th key={h} style={{padding:'8px 10px',fontSize:11,color:'rgba(255,255,255,0.4)',textAlign:h==='Batsman'?'left':'center',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {batStats(bs).map((b,i)=>(
                <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'9px 10px'}}><div style={{fontWeight:500,fontSize:13}}>{b.name}</div><div style={{fontSize:11,color:b.out?'rgba(255,255,255,0.3)':'#1D9E75',marginTop:1}}>{b.out?b.how:'not out'}</div></td>
                  {[b.r,b.bl,b.fours,b.sixes].map((v,j)=><td key={j} style={{padding:'9px 10px',textAlign:'center',fontSize:13,color:j===0?'#f0f4f2':'rgba(255,255,255,0.5)',fontWeight:j===0?600:400}}>{v}</td>)}
                  <td style={{padding:'9px 10px',textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.4)'}}>{b.bl>0?(b.r/b.bl*100).toFixed(0):'—'}</td>
                </tr>
              ))}
              {bs.length===0&&<tr><td colSpan={6} style={{padding:'20px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13}}>No balls yet</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{...card,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              {['Bowler','O','R','W','Econ'].map(h=><th key={h} style={{padding:'8px 10px',fontSize:11,color:'rgba(255,255,255,0.4)',textAlign:h==='Bowler'?'left':'center',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bowlStats(bs).map((b,i)=>(
                <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'9px 10px',fontWeight:500,fontSize:13}}>{b.name}</td>
                  <td style={{padding:'9px 10px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.6)'}}>{fmtOv(Math.floor(b.bl/6),b.bl%6)}</td>
                  <td style={{padding:'9px 10px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.6)'}}>{b.r}</td>
                  <td style={{padding:'9px 10px',textAlign:'center',fontSize:14,fontWeight:600}}>{b.w}</td>
                  <td style={{padding:'9px 10px',textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.4)'}}>{b.bl>0?(b.r/(b.bl/6)).toFixed(2):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#070d0a'}}>
      <div style={{background:'rgba(0,0,0,0.7)',borderBottom:'1px solid rgba(255,255,255,0.06)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:800,margin:'0 auto',padding:'12px 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <Link href="/" style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>← Back</Link>
            <span style={{color:'rgba(255,255,255,0.2)'}}>|</span>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontWeight:500}}>{match.label}</span>
            <span style={{marginLeft:'auto',fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:isLive?'rgba(226,75,74,0.2)':match.status==='upcoming'?'rgba(239,159,39,0.15)':'rgba(255,255,255,0.06)',color:isLive?'#F09595':match.status==='upcoming'?'#FAC775':'rgba(255,255,255,0.4)',border:`1px solid ${isLive?'rgba(226,75,74,0.3)':match.status==='upcoming'?'rgba(239,159,39,0.25)':'rgba(255,255,255,0.08)'}`}}>
              {isLive?<>🔴 Live</>:match.status==='upcoming'?'Upcoming':'Final'}
            </span>
          </div>
          {match.status!=='upcoming'&&(
            <div style={{paddingBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                <div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:4}}>{isInn2?batSecondTeam?.name:batFirstTeam?.name} batting</div>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:52,lineHeight:1}}>{cr}/{cw}</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:4}}>{fmtOv(co,cb)} overs · RR {rr(cr,co,cb)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  {isInn2&&target&&need!==null&&ovLeft!==null&&(
                    <>
                      <div style={{fontSize:22,fontWeight:700,color:'#FAC775'}}>Need {need}</div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2}}>off {ovLeft.toFixed(1)} ov</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>Target {target}</div>
                    </>
                  )}
                </div>
              </div>
              {match.status==='completed'&&match.winner_id&&(
                <div style={{marginTop:10,padding:'8px 12px',background:'rgba(29,158,117,0.1)',border:'1px solid rgba(29,158,117,0.2)',borderRadius:8,fontSize:13,color:'#1D9E75',fontWeight:500}}>
                  🏆 {match.winner_id===match.team1_id?match.team1?.name:match.team2?.name} won · {match.win_margin}
                </div>
              )}
            </div>
          )}
          <div style={{display:'flex',gap:2}}>
            {(['scorecard','overs','info'] as const).map(t=>(
              <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:800,margin:'0 auto',padding:'20px 16px'}}>
        {tab==='scorecard'&&(
          <div>
            <ScorecardInnings bs={inn1Balls} inn={1} batTeam={batFirstTeam}/>
            <ScorecardInnings bs={inn2Balls} inn={2} batTeam={batSecondTeam}/>
          </div>
        )}
        {tab==='overs'&&(
          <div>
            {[1,2].map(inn=>{
              const ibs=inn===1?inn1Balls:inn2Balls
              if(!ibs.length) return null
              return (
                <div key={inn} style={{marginBottom:24}}>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:20,marginBottom:12,color:'rgba(255,255,255,0.7)'}}>Innings {inn}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {groupOvers(ibs).map((over,oi)=>{
                      const ovRuns=over.reduce((s,b)=>s+b.total_runs,0),ovWkts=over.filter(b=>b.is_wicket).length
                      return (
                        <div key={oi} style={{...card,padding:'14px 16px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                            <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>Over {over[0].over_number+1}</span>
                            <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{ovRuns} runs{ovWkts>0?` · ${ovWkts}W`:''}{over[0].bowler?<span style={{color:'rgba(255,255,255,0.3)',marginLeft:8}}>{over[0].bowler.name}</span>:''}</span>
                          </div>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {over.map((b,bi)=>(
                              <div key={bi} style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,border:`1.5px solid ${dotColor(b)}`,color:dotColor(b),background:`${dotColor(b)}18`}}>{dotLabel(b)}</div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {balls.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.3)'}}>No balls bowled yet</div>}
          </div>
        )}
        {tab==='info'&&(
          <div style={{...card,padding:'20px'}}>
            {[
              ['Format',`T${match.overs}`],
              ['Match',match.label],
              ['Date',match.match_date||'TBD'],
              ['Toss',match.toss_winner_id?(match.toss_winner_id===match.team1_id?match.team1?.name:match.team2?.name)+' won & chose to '+match.toss_choice:'TBD'],
              ['Batting first',batFirstTeam?.name||'TBD'],
            ].map(([k,v])=>(
              <div key={k as string} style={{display:'flex',justifyContent:'space-between',paddingBottom:12,marginBottom:12,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontWeight:500}}>{k}</span>
                <span style={{fontSize:13,fontWeight:500,textAlign:'right'}}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
