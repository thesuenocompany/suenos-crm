// PART 4-B: Tasks, Tastings, Menu, Products, Stores, Reports (SVG), Map, Admin

// ─── TASKS VIEW ───────────────────────────────────────────────────────────────
function TasksView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId:'', title:'', dueDate:'', priority:'medium', assigneeId:'', notes:'' });
  const [filter, setFilter] = useState('open');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const isAdmin = state.user.role==='admin';
  const all = state.tasks.filter(t=>isAdmin||t.repId===state.user.id);
  const shown = all.filter(t=>filter==='done'?t.done:filter==='all'?true:!t.done);
  const overdue  = shown.filter(t=>!t.done&&t.dueDate<today());
  const upcoming = shown.filter(t=>!t.done&&t.dueDate>=today()).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const done     = shown.filter(t=>t.done);
  const myAccs   = isAdmin ? state.accounts : state.accounts.filter(a=>a.assignedRep===state.user.id);
  // All reps + ambassadors that can be assigned tasks
  const assignableUsers = state.users.filter(u=>['rep','ambassador'].includes(u.role) && u.active!==false);

  async function addTask() {
    if(!form.title||!form.dueDate) return;
    const repId = isAdmin && form.assigneeId ? form.assigneeId : state.user.id;
    const task = { id:genId(), accountId:form.accountId||null, title:form.title, dueDate:form.dueDate, priority:form.priority, repId, done:false, notes:form.notes||null };
    await dbAddTask(dispatch, task);
    // Send email notification if admin assigned to someone else
    console.log('[TaskEmail] isAdmin:', isAdmin, 'assigneeId:', form.assigneeId, 'userId:', state.user.id);
    if (isAdmin && form.assigneeId && form.assigneeId !== state.user.id) {
      const assignedUser = state.users.find(u=>u.id===form.assigneeId);
      const assigner     = state.users.find(u=>u.id===state.user.id);
      const acc          = state.accounts.find(a=>a.id===form.accountId);
      console.log('[TaskEmail] assignedUser:', assignedUser);
      await sendTaskNotification({
        assignedUser,
        assignerName: assigner?.name || state.user?.email || 'Admin',
        taskTitle:    form.title,
        accountName:  acc?.name || '',
        dueDate:      form.dueDate,
        priority:     form.priority,
      });
    }
    setForm({ accountId:'', title:'', dueDate:'', priority:'medium', assigneeId:'', notes:'' });
    setOpen(false);
    showToast(dispatch,'Task created');
  }

  const Row = ({ t }) => {
    const acc      = state.accounts.find(a=>a.id===t.accountId);
    const assigned = state.users.find(u=>u.id===t.repId);
    const isOD = !t.done&&t.dueDate<today();
    return (
      <Card cls="p-3.5">
        <div className="flex items-center gap-3">
          <button onClick={()=>dbUpdTask(dispatch,{...t,done:!t.done})}
            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${t.done?'bg-emerald-500 border-emerald-500':'border-gray-300 dark:border-gray-600 hover:border-teal-400'}`}>
            {t.done && <Ic n="check" cls="w-3 h-3 text-white"/>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${t.done?'line-through text-gray-400':'text-gray-900 dark:text-white'}`}>{t.title}</p>
            {t.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.notes}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {acc && <button onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:acc.id}})} className="text-xs text-blue-500 hover:underline">{acc.name}</button>}
              {isAdmin && assigned && <span className="text-xs text-gray-400">→ {assigned.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium ${isOD?'text-red-500':t.done?'text-gray-300':'text-gray-400'}`}>{fmtShort(t.dueDate)}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${t.priority==='high'?'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400':t.priority==='medium'?'bg-teal-100 text-teal-700 dark:bg-amber-900/30 dark:text-teal-400':'bg-gray-100 text-gray-500'}`}>{t.priority}</span>
            <button onClick={()=>dispatch({type:'DEL_TASK',id:t.id})} className="p-1 text-gray-300 hover:text-red-400 transition"><Ic n="trash" cls="w-3.5 h-3.5"/></button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{all.filter(t=>!t.done).length} open tasks</p>
        <Btn onClick={()=>setOpen(true)}><Ic n="plus" cls="w-4 h-4"/> Add Task</Btn>
      </div>
      <div className="flex gap-2 mb-4">
        {[{k:'open',l:'Open'},{k:'all',l:'All'},{k:'done',l:'Done'}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${filter===f.k?'bg-teal-600 border-teal-600 text-white':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>{f.l}</button>
        ))}
      </div>
      {overdue.length>0 && <div className="mb-4"><p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Overdue ({overdue.length})</p><div className="space-y-2">{overdue.map(t=><Row key={t.id} t={t}/>)}</div></div>}
      {upcoming.length>0 && <div className="mb-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Upcoming</p><div className="space-y-2">{upcoming.map(t=><Row key={t.id} t={t}/>)}</div></div>}
      {filter==='done' && done.length>0 && <div className="mb-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Completed</p><div className="space-y-2">{done.map(t=><Row key={t.id} t={t}/>)}</div></div>}
      {shown.length===0 && <EmptyState icon="tasks" title="No tasks" desc="Add a task to every account." action={<Btn onClick={()=>setOpen(true)}>Add Task</Btn>}/>}

      <Modal open={open} onClose={()=>setOpen(false)} title="New Task">
        <div className="space-y-3">
          <FInput label="Task Title" value={form.title} onChange={v=>set('title',v)} placeholder="e.g. Follow up on listing" required/>
          <FSelect label="Account (optional)" value={form.accountId} onChange={v=>set('accountId',v)} options={[{value:'',label:'— none —'},...myAccs.map(a=>({value:a.id,label:a.name}))]}/>
          {isAdmin && (
            <FSelect label="Assign To" value={form.assigneeId} onChange={v=>set('assigneeId',v)}
              options={[{value:'',label:'— myself —'},...assignableUsers.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FInput label="Due Date" value={form.dueDate} onChange={v=>set('dueDate',v)} type="date" required/>
            <FSelect label="Priority" value={form.priority} onChange={v=>set('priority',v)} options={['low','medium','high']}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} placeholder="Any additional context or instructions..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={addTask} cls="flex-1" disabled={!form.title||!form.dueDate}>Add Task</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── EVENTS CALENDAR ──────────────────────────────────────────────────────────
function CalendarEventModal({ event, onClose }) {
  const timeStr = event.eventTime ? ' at ' + event.eventTime.slice(0,5) : '';
  return (
    <Modal open={true} onClose={onClose} title="Tasting Event">
      <div className="space-y-2">
        <p className="text-base font-semibold text-gray-900 dark:text-white">{event.title}</p>
        <p className="text-sm text-gray-500">{event.eventDate}{timeStr}</p>
        {event.location && <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">Location:</span> {event.location}</p>}
        {event.staffedByName && <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">Staffed by:</span> {event.staffedByName}</p>}
        {event.notes && <p className="text-sm text-gray-500 whitespace-pre-line mt-2">{event.notes}</p>}
        <div className="pt-2">
          <Btn variant="secondary" onClick={onClose} cls="w-full">Close</Btn>
        </div>
      </div>
    </Modal>
  );
}
function CalendarView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user.role === 'admin';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [viewEvent, setViewEvent] = useState(null);
  const blank = { title:'', eventDate:'', eventTime:'', location:'', accountId:'', staffedByName:'', notes:'' };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  // Build grid cells
  const firstDow  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i=0; i<firstDow; i++) cells.push(null);
  for (let d=1; d<=daysInMo; d++) cells.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthEvents = useMemo(() =>
    (state.tastingEvents||[]).filter(e => e.eventDate && e.eventDate.startsWith(monthPrefix)),
    [state.tastingEvents, year, month]
  );
  const eventsForDay = date => monthEvents.filter(e => e.eventDate === date);

  function openNew(date) {
    if (!isAdmin) return;
    setEditEvent(null);
    setForm({...blank, eventDate: date});
    setModalOpen(true);
  }
  function openEdit(evt) {
    if (!isAdmin) { setViewEvent(evt); return; }
    setEditEvent(evt);
    setForm({ title:evt.title, eventDate:evt.eventDate, eventTime:evt.eventTime||'',
      location:evt.location||'', accountId:evt.accountId||'',
      staffedByName:evt.staffedByName||'', notes:evt.notes||'' });
    setModalOpen(true);
  }
  async function save() {
    if (!form.title || !form.eventDate) return;
    const isNew = !editEvent;
    const evt = { id:(editEvent ? editEvent.id : genId()), title:form.title, eventDate:form.eventDate,
      eventTime:form.eventTime||null, location:form.location||null, accountId:form.accountId||null,
      staffedByName:form.staffedByName||null, notes:form.notes||null, createdBy:state.user.id };
    if (isNew) await dbAddTastingEvent(dispatch, evt);
    else await dbUpdTastingEvent(dispatch, evt);
    setModalOpen(false);
    showToast(dispatch, isNew ? 'Event created' : 'Event updated');
  }
  async function remove() {
    if (!editEvent) return;
    await dbDelTastingEvent(dispatch, editEvent.id);
    setModalOpen(false);
    showToast(dispatch, 'Event deleted');
  }


  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition">
            <Ic n="chevL" cls="w-5 h-5"/>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white w-44 text-center">{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition">
            <Ic n="chevR" cls="w-5 h-5"/>
          </button>
        </div>
        {isAdmin && <Btn onClick={()=>openNew(today())}><Ic n="plus" cls="w-4 h-4"/> Add Event</Btn>}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(d=>(
          <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {cells.map((date,i) => {
          const dayEvts = date ? eventsForDay(date) : [];
          const isToday = date === today();
          return (
            <div key={i}
              onClick={()=>date && openNew(date)}
              className={`min-h-[80px] border-r border-b border-gray-200 dark:border-gray-700 p-1.5
                ${date && isAdmin ? 'cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-900/10' : ''}
                ${!date ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-900'}`}>
              {date && (
                <>
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-teal-500 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {parseInt(date.split('-')[2])}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvts.map(evt=>(
                      <button key={evt.id} onClick={e=>{e.stopPropagation(); openEdit(evt);}}
                        className="w-full text-left text-xs px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900/80 transition truncate leading-tight">
                        {evt.eventTime ? evt.eventTime.slice(0,5)+' · ' : ''}{evt.title}
                        {evt.staffedByName ? <span className="ml-1 opacity-60">({evt.staffedByName.split(' ')[0]})</span> : null}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming events list below calendar */}
      {monthEvents.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">This Month ({monthEvents.length})</p>
          <div className="space-y-2">
            {[...monthEvents].sort((a,b)=>a.eventDate.localeCompare(b.eventDate)||(a.eventTime||'').localeCompare(b.eventTime||'')).map(evt=>{
              const acc = evt.accountId ? state.accounts.find(a=>a.id===evt.accountId) : null;
              return (
                <button key={evt.id} onClick={()=>openEdit(evt)} className="w-full text-left">
                  <Card cls="p-3 hover:border-teal-300 dark:hover:border-teal-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 text-center">
                        <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">{monthNames[parseInt(evt.eventDate.split('-')[1])-1].slice(0,3)}</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{parseInt(evt.eventDate.split('-')[2])}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{evt.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {evt.eventTime      && <span className="text-xs text-gray-500">{evt.eventTime.slice(0,5)}</span>}
                          {evt.location       && <span className="text-xs text-gray-500 truncate">{evt.location}</span>}
                          {evt.staffedByName  && <span className="text-xs text-teal-600 dark:text-teal-400">{evt.staffedByName}</span>}
                          {acc                && <span className="text-xs text-blue-500">{acc.name}</span>}
                        </div>
                        {evt.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{evt.notes}</p>}
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin: create / edit modal */}
      {isAdmin && (
        <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editEvent ? 'Edit Event' : 'New Tasting Event'}>
          <div className="space-y-3">
            <FInput label="Event Title" value={form.title} onChange={v=>set('title',v)} placeholder="e.g. Friday Night Tasting at The Wildhorse" required/>
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Date" value={form.eventDate} onChange={v=>set('eventDate',v)} type="date" required/>
              <FInput label="Time (optional)" value={form.eventTime} onChange={v=>set('eventTime',v)} type="time"/>
            </div>
            <FInput label="Location" value={form.location} onChange={v=>set('location',v)} placeholder="Venue name and address"/>
            <FSelect label="Linked Account (optional)" value={form.accountId} onChange={v=>set('accountId',v)}
              options={[{value:'',label:'— none —'},...(state.accounts||[]).map(a=>({value:a.id,label:a.name}))]}/>
            <FInput label="Staffed By (optional)" value={form.staffedByName} onChange={v=>set('staffedByName',v)} placeholder="Name of rep or third-party staff"/>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
              <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3}
                placeholder="What to bring, special instructions, goals…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"/>
            </div>
            <div className="flex gap-2 pt-1">
              {editEvent && <Btn variant="secondary" onClick={remove} cls="flex-shrink-0 text-red-500 border-red-200 dark:border-red-800">Delete</Btn>}
              <Btn variant="secondary" onClick={()=>setModalOpen(false)} cls="flex-1">Cancel</Btn>
              <Btn onClick={save} cls="flex-1" disabled={!form.title||!form.eventDate}>{editEvent ? 'Save' : 'Create'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Read-only view modal for non-admins */}
      {viewEvent && <CalendarEventModal event={viewEvent} onClose={()=>setViewEvent(null)}/>}
    </div>
  );
}

// ─── TASTINGS ─────────────────────────────────────────────────────────────────
function TastingsView() {
  const { state, dispatch } = useApp();
  const sorted = [...state.tastings].sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{sorted.length} activations</p>
        <Btn onClick={()=>dispatch({type:'NAV',view:'new-tasting'})}><Ic n="plus" cls="w-4 h-4"/> Log Tasting</Btn>
      </div>
      {sorted.length===0 ? <EmptyState icon="tastings" title="No tastings yet" action={<Btn onClick={()=>dispatch({type:'NAV',view:'new-tasting'})}>Log Tasting</Btn>}/>
        : <div className="space-y-2">
            {sorted.map(t=>{
              const acc = state.accounts.find(a=>a.id===t.accountId);
              return (
                <Card key={t.id} cls="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{acc?.name||t.location}</p><p className="text-xs text-gray-500">{t.location}</p></div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(t.date)}</span>
                  </div>
                  <div className="flex gap-2 text-xs flex-wrap">
                    <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg">{t.samplesServed} samples</span>
                    <span className="px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400 rounded-lg">{t.bottlesUsed} btl used</span>
                    <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">{t.staff}</span>
                  </div>
                  {t.notes && <p className="text-xs text-gray-500 mt-2">{t.notes}</p>}
                </Card>
              );
            })}
          </div>
      }
    </div>
  );
}

function NewTasting() {
  const { state, dispatch } = useApp();
  const prefillAccId = state.params?.accountId||'';
  const prefillAccName = state.accounts.find(a=>a.id===prefillAccId)?.name||'';
  const [form, setForm] = useState({ accountId:prefillAccId, date:today(), location:prefillAccName, staff:state.user.name, bottlesUsed:'', samplesServed:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const tasting = { ...form, id:genId(), bottlesUsed:parseInt(form.bottlesUsed)||0, samplesServed:parseInt(form.samplesServed)||0, repId:state.user.id };
    await dbAddTasting(dispatch, tasting);
    showToast(dispatch,'Activation logged');
    dispatch({type:'NAV',view:'tastings'});
    setSaving(false);
  }
  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
      <button onClick={()=>dispatch({type:'NAV',view:'tastings'})} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4"><Ic n="chevL" cls="w-3.5 h-3.5"/> Back</button>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Log Tasting / Activation</h2>
      <form onSubmit={submit} className="space-y-3">
        <FSelect label="Account" value={form.accountId} onChange={v=>set('accountId',v)} options={state.accounts.map(a=>({value:a.id,label:a.name}))}/>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Date" value={form.date} onChange={v=>set('date',v)} type="date" required/>
          <FInput label="Staff Member" value={form.staff} onChange={v=>set('staff',v)} required/>
        </div>
        <FInput label="Location / Event" value={form.location} onChange={v=>set('location',v)} placeholder="Store tasting, industry night..." required/>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Bottles Used" value={form.bottlesUsed} onChange={v=>set('bottlesUsed',v)} type="number" placeholder="2" required/>
          <FInput label="Samples Served" value={form.samplesServed} onChange={v=>set('samplesServed',v)} type="number" placeholder="40" required/>
        </div>
        <FInput label="Notes" value={form.notes} onChange={v=>set('notes',v)} rows={2}/>
        <div className="flex gap-2 pt-1">
          <Btn variant="secondary" onClick={()=>dispatch({type:'NAV',view:'tastings'})} cls="flex-1">Cancel</Btn>
          <Btn type="submit" cls="flex-1" disabled={!form.location||!form.bottlesUsed||saving}>{saving?'Saving…':'Log Tasting'}</Btn>
        </div>
      </form>
    </div>
  );
}

// ─── MENU PLACEMENTS ──────────────────────────────────────────────────────────
function MenuPlacementsView() {
  const { state, dispatch, db } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // placement being edited
  const [lightbox, setLightbox] = useState(null);
  const [fType, setFType] = useState('');
  const [fAcct, setFAcct] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = state.user?.role === 'admin';
  const myAccounts = isAdmin
    ? state.accounts
    : state.accounts.filter(a => a.assignedRep === state.user?.id);

  const blank = { accountId:'', listingType:'Cocktail', itemName:'', price:'', includesTax:false, description:'', startDate:'', endDate:'' };
  const [form, setForm] = useState(blank);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function openAdd() { setEditing(null); setForm(blank); setPhotoFile(null); setPhotoPreview(null); setShowForm(true); }
  function openEdit(p) {
    setEditing(p);
    setForm({ accountId:p.accountId, listingType:p.listingType, itemName:p.itemName,
      price:p.price!=null?String(p.price):'', includesTax:p.includesTax,
      description:p.description||'', startDate:p.startDate||'', endDate:p.endDate||'' });
    setPhotoFile(null);
    setPhotoPreview(p.photoUrl||null);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditing(null); setForm(blank); setPhotoFile(null); setPhotoPreview(null); }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.accountId || !form.itemName) return;
    setSaving(true);
    const fields = {
      accountId: form.accountId,
      repId: editing ? editing.repId : state.user.id,
      listingType: form.listingType,
      itemName: form.itemName,
      price: form.price ? parseFloat(form.price) : null,
      includesTax: form.includesTax,
      description: form.description,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };
    if (editing) {
      await db.dbUpdMenuPlacement(dispatch, { ...editing, ...fields }, photoFile);
      showToast(dispatch, 'Placement updated');
    } else {
      await db.dbAddMenuPlacement(dispatch, { id: genId(), ...fields }, photoFile);
      showToast(dispatch, 'Menu placement saved');
    }
    closeForm();
    setSaving(false);
  }

  const placements = state.placements || [];
  const filtered = placements
    .filter(p => !fType || p.listingType === fType)
    .filter(p => !fAcct || p.accountId === fAcct);

  const cocktailCount = placements.filter(p=>p.listingType==='Cocktail').length;
  const spiritCount   = placements.filter(p=>p.listingType==='Spirit Listing').length;

  const selCls = "px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300";
  const iCls   = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none";

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Card cls="p-4 text-center">
          <p className="text-2xl font-bold text-teal-600">{placements.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Placements</p>
        </Card>
        <Card cls="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{cocktailCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Cocktails</p>
        </Card>
        <Card cls="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{spiritCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Spirit Listings</p>
        </Card>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <select value={fType} onChange={e=>setFType(e.target.value)} className={selCls}>
            <option value="">All Types</option>
            <option>Cocktail</option>
            <option>Spirit Listing</option>
          </select>
          <select value={fAcct} onChange={e=>setFAcct(e.target.value)} className={selCls}>
            <option value="">All Accounts</option>
            {state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <Btn onClick={openAdd}><Ic n="plus" cls="w-4 h-4"/> Add Placement</Btn>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0
          ? <EmptyState icon="menu" title="No placements yet" sub="Add your first menu placement above"/>
          : filtered.map(p => {
              const acct = state.accounts.find(a=>a.id===p.accountId);
              const rep  = state.users.find(u=>u.id===p.repId);
              return (
                <Card key={p.id} cls="p-0 overflow-hidden">
                  <div className="flex">
                    {/* Photo */}
                    {p.photoUrl
                      ? <img src={p.photoUrl} alt={p.itemName}
                          className="w-24 h-24 object-cover flex-shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                          onClick={()=>setLightbox({url:p.photoUrl, title:p.itemName})}/>
                      : <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center" style={{background:'linear-gradient(135deg,#0d9488,#0891b2)'}}>
                          <Ic n="menu" cls="w-8 h-8 text-white/60"/>
                        </div>
                    }
                    {/* Content */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.itemName}</p>
                          <p className="text-xs text-gray-500">{acct?.name || 'Unknown'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.listingType==='Cocktail'?'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            {p.listingType}
                          </span>
                          <button onClick={()=>openEdit(p)} className="p-1 rounded-lg text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title="Edit">
                            <Ic n="edit" cls="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {p.price != null && (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            ${parseFloat(p.price).toFixed(2)}{p.includesTax && <span className="text-xs text-gray-400 ml-1">incl. tax</span>}
                          </span>
                        )}
                        {(p.startDate || p.endDate) && (
                          <span className="text-xs text-gray-400">
                            {p.startDate||'?'}{p.endDate ? ` → ${p.endDate}` : ' →'}
                          </span>
                        )}
                        {rep && <span className="text-xs text-gray-400">{rep.name}</span>}
                      </div>
                      {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                    </div>
                  </div>
                </Card>
              );
            })
        }
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.88)'}}
          onClick={()=>setLightbox(null)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition"
            onClick={()=>setLightbox(null)}>✕</button>
          <img src={lightbox.url} alt={lightbox.title}
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            style={{maxHeight:'90vh', maxWidth:'90vw', objectFit:'contain'}}
            onClick={e=>e.stopPropagation()}/>
          {lightbox.title && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm font-medium opacity-70">{lightbox.title}</p>
          )}
        </div>
      )}

      {/* Add / Edit Placement Modal */}
      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Placement' : 'Add Menu Placement'}>
        <form onSubmit={save} className="space-y-3">
          {/* Account */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Account *</label>
            <select value={form.accountId} onChange={e=>set('accountId',e.target.value)} required className={iCls}>
              <option value="">Select account…</option>
              {state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Listing type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Listing Type *</label>
            <div className="flex gap-2">
              {['Cocktail','Spirit Listing'].map(t=>(
                <button key={t} type="button"
                  onClick={()=>set('listingType',t)}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${form.listingType===t ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Item name */}
          <FInput label="Item Name *" value={form.itemName} onChange={v=>set('itemName',v)} required placeholder="e.g. Jalisco Sunset"/>

          {/* Price + tax */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <FInput label="Price" value={form.price} onChange={v=>set('price',v)} type="number" placeholder="0.00"/>
            </div>
            <label className="flex items-center gap-2 pb-2 cursor-pointer flex-shrink-0">
              <div onClick={()=>set('includesTax',!form.includesTax)}
                className={`w-9 h-5 rounded-full relative transition ${form.includesTax?'bg-teal-600':'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.includesTax?'left-4':'left-0.5'}`}/>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Includes tax</span>
            </label>
          </div>

          {/* Start / End dates */}
          <div className="grid grid-cols-2 gap-3">
            <FInput label="Start Date" value={form.startDate} onChange={v=>set('startDate',v)} type="date"/>
            <FInput label="End Date" value={form.endDate} onChange={v=>set('endDate',v)} type="date"/>
          </div>

          {/* Description / Recipe */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description / Recipe</label>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3}
              placeholder="Ingredients, method, garnish…"
              className={iCls + " resize-none"}/>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo</label>
            {photoPreview
              ? <div className="relative">
                  <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl"/>
                  <button type="button" onClick={()=>{ setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80">✕</button>
                </div>
              : <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-teal-400 transition-colors">
                  <Ic n="camera" cls="w-6 h-6 text-gray-400 mb-1"/>
                  <span className="text-xs text-gray-400">Click to upload photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>
                </label>
            }
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={()=>{ setShowForm(false); setForm(blank); setPhotoFile(null); setPhotoPreview(null); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
              style={{background:'linear-gradient(135deg,#0d9488,#0f766e)'}}>
              {saving ? 'Saving…' : 'Save Placement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
function ProductsView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const PRICE_REGIONS = ['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','MX'];
  const PRICE_REGION_LABELS = {BC:'BC',AB:'AB',SK:'SK',MB:'MB',ON:'ON',QC:'QC',NB:'NB',NS:'NS',PE:'PE',NL:'NL',MX:'Mexico'};
  const blank = { name:'', sku:'', size:'750ml', casePack:12, price:'', prices:{}, active:true, upc:'', scc:'', cspc:'' };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setPrice = (region, val) => setForm(f=>({...f, prices:{...f.prices, [region]: val===''?undefined:val}}));
  const isAdmin = state.user?.role === 'admin';

  function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function openAdd() { setEditing(null); setForm(blank); setImgFile(null); setImgPreview(null); setOpen(true); }
  function openEdit(p) {
    setEditing(p);
    setForm({...p, price:p.price!=null?String(p.price):'', prices:p.prices||{}});
    setImgFile(null);
    setImgPreview(p.imageUrl||null);
    setOpen(true);
  }
  function closeModal() { setOpen(false); setImgFile(null); setImgPreview(null); }

  async function save() {
    if (!form.name || !form.sku) return;
    setSaving(true);
    // Clean prices: remove empty/undefined values, parse to numbers
    const cleanPrices = {};
    for (const [k,v] of Object.entries(form.prices||{})) {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) cleanPrices[k] = n;
    }
    const base = {...form, price:parseFloat(form.price)||0, prices:cleanPrices};
    if (editing) {
      await dbUpdProduct(dispatch, {...base, id:editing.id, imageUrl:editing.imageUrl||null}, imgFile);
      showToast(dispatch, 'Product updated');
    } else {
      await dbAddProduct(dispatch, {...base, id:genId()}, imgFile);
      showToast(dispatch, 'Product added');
    }
    setSaving(false);
    closeModal();
  }

  async function del(p) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await dbDelProduct(dispatch, p.id);
    showToast(dispatch, `"${p.name}" deleted`);
  }

  async function downloadImage(p) {
    const res = await fetch(p.imageUrl);
    const blob = await res.blob();
    const ext = p.imageUrl.split('.').pop().split('?')[0] || 'jpg';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${p.name.replace(/\s+/g,'-')}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  const PCOLS = ['bg-teal-600','bg-emerald-500','bg-blue-500','bg-purple-500'];
  const iCls  = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none";

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{state.products.length} products</p>
        {isAdmin && <Btn onClick={openAdd}><Ic n="plus" cls="w-4 h-4"/> Add Product</Btn>}
      </div>

      <div className="space-y-2">
        {state.products.map((p,i)=>(
          <Card key={p.id} cls="p-0 overflow-hidden">
            <div className="flex items-stretch">
              {/* Image / color swatch */}
              {p.imageUrl
                ? <img src={p.imageUrl} alt={p.name}
                    className="w-20 h-20 object-cover flex-shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                    onClick={()=>setLightbox({url:p.imageUrl, title:p.name})}/>
                : <div className={`w-20 h-20 flex-shrink-0 ${PCOLS[i%4]} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{p.name.split(' ').pop()[0]}</span>
                  </div>
              }
              {/* Content */}
              <div className="flex-1 px-3 py-2.5 flex items-center justify-between min-w-0 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">SKU: {p.sku} · {p.size} · {p.casePack}/case</p>
                  {(p.upc||p.scc||p.cspc) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[p.upc&&`UPC: ${p.upc}`, p.scc&&`SCC: ${p.scc}`, p.cspc&&`CSPC: ${p.cspc}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {/* Province prices */}
                  {Object.keys(p.prices||{}).length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','MX'].filter(r=>p.prices[r]).map(r=>(
                        <span key={r} className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded font-medium">
                          {r} ${parseFloat(p.prices[r]).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Default: ${parseFloat(p.price||0).toFixed(2)}/bottle</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300':'bg-gray-100 text-gray-500'}`}>
                    {p.active?'Active':'Inactive'}
                  </span>
                  {/* Download button — visible to everyone when image exists */}
                  {p.imageUrl && (
                    <button onClick={()=>downloadImage(p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title="Download image">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                  )}
                  {isAdmin && <>
                    <Btn variant="ghost" size="sm" onClick={()=>openEdit(p)}><Ic n="edit" cls="w-3.5 h-3.5"/></Btn>
                    <button onClick={()=>del(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Ic n="trash" cls="w-3.5 h-3.5"/></button>
                  </>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.88)'}} onClick={()=>setLightbox(null)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition"
            onClick={()=>setLightbox(null)}>✕</button>
          <img src={lightbox.url} alt={lightbox.title} className="rounded-2xl shadow-2xl"
            style={{maxHeight:'90vh', maxWidth:'90vw', objectFit:'contain'}}
            onClick={e=>e.stopPropagation()}/>
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing?'Edit Product':'New Product'}>
        <div className="space-y-3">
          {/* Product image upload (admin only) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Image</label>
            {imgPreview
              ? <div className="relative">
                  <img src={imgPreview} alt="preview" className="w-full h-36 object-contain rounded-xl bg-gray-50 dark:bg-gray-800"/>
                  <button type="button" onClick={()=>{ setImgFile(null); setImgPreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80">✕</button>
                </div>
              : <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-teal-400 transition-colors">
                  <Ic n="camera" cls="w-5 h-5 text-gray-400 mb-1"/>
                  <span className="text-xs text-gray-400">Click to upload image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImg}/>
                </label>
            }
          </div>
          <FInput label="Product Name" value={form.name} onChange={v=>set('name',v)} required/>
          <div className="grid grid-cols-2 gap-3">
            <FInput label="SKU" value={form.sku} onChange={v=>set('sku',v)} required/>
            <FInput label="Bottle Size" value={form.size} onChange={v=>set('size',v)} placeholder="750ml"/>
            <FInput label="Case Pack" value={form.casePack} onChange={v=>set('casePack',parseInt(v)||12)} type="number"/>
            <FInput label="Default Price/Bottle" value={form.price} onChange={v=>set('price',v)} type="number" placeholder="Fallback price"/>
          </div>
          {/* Per-province pricing */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pricing by Province / Region</p>
            <p className="text-xs text-gray-400 mb-3">Leave blank to use the default price above. MX = Mexico export price.</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {PRICE_REGIONS.map(r => (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 w-8 flex-shrink-0">{PRICE_REGION_LABELS[r]}</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input type="number" min="0" step="0.01" placeholder={form.price||'0.00'}
                      value={form.prices[r]??''}
                      onChange={e=>setPrice(r, e.target.value)}
                      className="w-full pl-5 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none"/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Product Codes</p>
            <div className="space-y-2">
              <FInput label="UPC" value={form.upc} onChange={v=>set('upc',v)} placeholder="e.g. 00628942548437"/>
              <FInput label="SCC" value={form.scc} onChange={v=>set('scc',v)} placeholder="e.g. 07540013280974"/>
              <FInput label="CSPC" value={form.cspc} onChange={v=>set('cspc',v)} placeholder="e.g. 334590"/>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={()=>set('active',!form.active)} className={`w-9 h-5 rounded-full relative transition ${form.active?'bg-teal-600':'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.active?'left-4':'left-0.5'}`}/>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={closeModal} cls="flex-1">Cancel</Btn>
            <Btn onClick={save} cls="flex-1" disabled={!form.name||!form.sku||saving}>{saving?'Saving…':'Save'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── FULFILLMENT STORES ───────────────────────────────────────────────────────
function StoresView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { name:'', address:'', contact:'', email:'', phone:'', region:'', licenseNumber:'', gstNumber:'', etransferAddress:'', province:'' };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  async function save() {
    if(!form.name||!form.email) return;
    if(editing) { await dbUpdStore(dispatch,{...form,id:editing.id}); showToast(dispatch,'Store updated'); }
    else { await dbAddStore(dispatch,{...form,id:genId()}); showToast(dispatch,'Store added'); }
    setOpen(false);
  }
  async function del(s) {
    if(!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    await dbDelStore(dispatch, s.id);
    showToast(dispatch, `"${s.name}" deleted`);
  }
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{state.stores.length} stores</p>
        {state.user.role==='admin' && <Btn onClick={()=>{ setEditing(null); setForm(blank); setOpen(true); }}><Ic n="plus" cls="w-4 h-4"/> Add Store</Btn>}
      </div>
      <div className="space-y-3">
        {state.stores.map(s=>(
          <Card key={s.id} cls="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.region}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Ic n="users" cls="w-3 h-3"/>{s.contact}</div>
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Ic n="mail" cls="w-3 h-3"/>{s.email}</a>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><Ic n="pin" cls="w-3 h-3"/>{s.address}</div>
                  {s.province && (()=>{const pt=getProvinceTax(s.province,state.provinceTaxRates);return(
                    <div className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-medium"><Ic n="tag" cls="w-3 h-3"/>
                      {s.province}{pt ? ` · ${pt.pstRate>0?`PST ${pt.pstRate}% + `:''}${pt.gstLabel} ${pt.gstRate}%` : ''}
                    </div>
                  );})()}
                  {s.licenseNumber && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Ic n="tag" cls="w-3 h-3"/>License #{s.licenseNumber}</div>}
                  {s.gstNumber && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Ic n="tag" cls="w-3 h-3"/>GST #{s.gstNumber}</div>}
                </div>
              </div>
              {state.user.role==='admin' && <div className="flex gap-1 flex-shrink-0">
                <Btn variant="ghost" size="sm" onClick={()=>{ setEditing(s); setForm({...s}); setOpen(true); }}><Ic n="edit" cls="w-3.5 h-3.5"/></Btn>
                <button onClick={()=>del(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Ic n="trash" cls="w-3.5 h-3.5"/></button>
              </div>}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Store':'New Fulfillment Store'}>
        <div className="space-y-3">
          <FInput label="Store Name" value={form.name} onChange={v=>set('name',v)} required/>
          <FSelect label="Region" value={form.region} onChange={v=>set('region',v)} options={state.regions?.length?state.regions.map(r=>r.name):REGIONS} required/>
          <FInput label="Address" value={form.address} onChange={v=>set('address',v)}/>
          <div className="grid grid-cols-2 gap-3">
            <FInput label="Contact" value={form.contact} onChange={v=>set('contact',v)}/>
            <FInput label="Phone" value={form.phone} onChange={v=>set('phone',v)}/>
          </div>
          <FInput label="Email" value={form.email} onChange={v=>set('email',v)} type="email" required/>
          <FSelect label="Province / Territory" value={form.province} onChange={v=>set('province',v)} options={PROVINCE_OPTIONS}/>
          {form.province && (()=>{const pt=getProvinceTax(form.province,state.provinceTaxRates);return pt?(
            <p className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-lg">
              Tax rates: {pt.pstRate>0?`${pt.pstLabel} ${pt.pstRate}% + `:''}{pt.gstLabel} {pt.gstRate}% (total {pt.pstRate+pt.gstRate}%) · <span className="text-gray-400">configure in Settings → Province Tax Rates</span>
            </p>
          ):null;})()}
          <div className="grid grid-cols-2 gap-3">
            <FInput label="Liquor License #" value={form.licenseNumber} onChange={v=>set('licenseNumber',v)} placeholder="Store liquor license number"/>
            <FInput label="GST Registration #" value={form.gstNumber} onChange={v=>set('gstNumber',v)} placeholder="Store GST number"/>
          </div>
          <FInput label="E-transfer address (shown on invoices)" value={form.etransferAddress} onChange={v=>set('etransferAddress',v)} placeholder="e.g. payments@store.com"/>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={save} cls="flex-1" disabled={!form.name||!form.email}>Save Store</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── REPORTS (SVG charts) ─────────────────────────────────────────────────────
function ReportsView() {
  const { state, dispatch } = useApp();
  const { sales, accounts, visits, users, products } = state;

  const _regionNames = (state.regions?.length?state.regions.map(r=>r.name):REGIONS);
  const byRegion = _regionNames.map(r=>({ name:r.split('/')[0].trim().slice(0,9), region:r, bottles:sales.filter(s=>accounts.find(a=>a.id===s.accountId)?.region===r).reduce((s,x)=>s+x.bottles,0) })).filter(r=>r.bottles>0).sort((a,b)=>b.bottles-a.bottles).slice(0,7);
  const PCOLS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6'];
  const byProduct = products.map((p,i)=>({ name:p.name.split(' ').pop(), value:sales.filter(s=>s.productId===p.id).reduce((s,x)=>s+x.bottles,0), fill:PCOLS[i] })).filter(p=>p.value>0);
  const byRep = users.filter(u=>u.role==='rep').map(u=>({ name:u.name.split(' ')[0], bottles:sales.filter(s=>accounts.find(a=>a.id===s.accountId)?.assignedRep===u.id).reduce((s,x)=>s+x.bottles,0), visits:visits.filter(v=>v.repId===u.id).length }));

  const now = new Date();
  const months6 = Array.from({length:6},(_,i)=>{ const d=new Date(now); d.setMonth(d.getMonth()-5+i); return d.toISOString().slice(0,7); });
  const trendData = months6.map(m=>({ month:m.slice(5), bottles:sales.filter(s=>s.month===m).reduce((s,x)=>s+x.bottles,0), visits:visits.filter(v=>v.date.startsWith(m)).length }));

  const unvisited = accounts.filter(a=>a.status!=='Lost').map(a=>({...a,vd:daysSince(a.lastVisit)})).filter(a=>a.vd>60).sort((a,b)=>b.vd-a.vd);
  const tastingImpact = state.tastings.map(t=>{ const acc=accounts.find(a=>a.id===t.accountId); return { ...t, accName:acc?.name||t.location, salesAfter:acc?sales.filter(s=>s.accountId===acc.id&&s.month>=t.date.slice(0,7)).reduce((s,x)=>s+x.bottles,0):0 }; }).sort((a,b)=>b.salesAfter-a.salesAfter);

  const totalBottles  = sales.reduce((s,x)=>s+x.bottles,0);
  const totalRevenue  = sales.reduce((s,x)=>s+x.revenue,0);
  const btlPerVisit   = visits.length ? (totalBottles/visits.length).toFixed(1) : 0;
  const revPerVisit   = visits.length ? fmtCurrency(totalRevenue/visits.length) : '-';

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto pb-24 lg:pb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Bottles" value={totalBottles} icon="products" color="amber"/>
        <StatCard label="Total Revenue" value={fmtCurrency(totalRevenue)} icon="reports" color="emerald"/>
        <StatCard label="Btl / Visit" value={btlPerVisit} icon="visits" color="blue"/>
        <StatCard label="Rev / Visit" value={revPerVisit} icon="targets" color="purple"/>
      </div>

      {/* Trend */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Bottles Sold + Visit Activity (6 months)</p>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">Bottles</p>
            <AreaChart data={trendData} xKey="month" yKey="bottles" color="#f59e0b" h={120}/>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Visits</p>
            <AreaChart data={trendData} xKey="month" yKey="visits" color="#3b82f6" h={120}/>
          </div>
        </div>
      </Card>

      {/* Region + Product */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card cls="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Bottles by Region</p>
            <p className="text-xs text-gray-400">Click to view accounts</p>
          </div>
          <BarChart data={byRegion} xKey="name" yKey="bottles" color="#f59e0b" h={180} horizontal={true} onBarClick={d=>dispatch({type:'NAV',view:'accounts',params:{region:d.region,salesOnly:true}})} />
        </Card>
        <Card cls="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Bottles by Product</p>
          <DonutChart data={byProduct} h={220}/>
        </Card>
      </div>

      {/* Rep table */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Rep Performance — All Time</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-gray-800">{['Rep','Bottles','Visits','Btl/Visit','Listed Accs'].map(h=><th key={h} className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">{h}</th>)}</tr></thead>
            <tbody>{byRep.sort((a,b)=>b.bottles-a.bottles).map((r,i)=>(
              <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{r.name}</td>
                <td className="py-2 pr-4 text-teal-700 font-semibold">{r.bottles}</td>
                <td className="py-2 pr-4 text-gray-500">{r.visits}</td>
                <td className="py-2 pr-4 text-gray-500">{r.visits?(r.bottles/r.visits).toFixed(1):'-'}</td>
                <td className="py-2 text-gray-500">{accounts.filter(a=>a.assignedRep===users.find(u=>u.name.startsWith(r.name))?.id&&(a.status==='Listed'||a.status==='Active')).length}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      {/* Unvisited */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Accounts Not Visited (60+ days)</p>
        <p className="text-xs text-gray-400 mb-3">{unvisited.length} account{unvisited.length!==1?'s':''} need attention</p>
        {unvisited.length===0 ? <p className="text-xs text-gray-400 text-center py-3">All accounts visited recently</p>
          : <div className="space-y-1.5">{unvisited.slice(0,8).map(a=>(
              <div key={a.id} className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
                onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:a.id}})}>
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</p><p className="text-xs text-gray-400">{a.region}</p></div>
                <span className="text-xs text-red-500 font-medium">{a.vd===999?'Never':`${a.vd}d ago`}</span>
              </div>
            ))}</div>
        }
      </Card>

      {/* Tasting impact */}
      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tasting Impact on Sales</p>
        {tastingImpact.length===0 ? <EmptyState icon="tastings" title="No tastings logged yet"/>
          : <div className="space-y-2">{tastingImpact.map(t=>(
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{t.accName}</p><p className="text-xs text-gray-400">{fmtDate(t.date)} · {t.samplesServed} samples</p></div>
                <div className="text-right"><p className="text-sm font-bold text-teal-700">{t.salesAfter} btl</p><p className="text-xs text-gray-400">post-event</p></div>
              </div>
            ))}</div>
        }
      </Card>
    </div>
  );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────
const REGION_COLORS = ['#0d9488','#7c3aed','#dc2626','#d97706','#2563eb','#db2777','#059669','#9333ea','#ea580c','#0891b2','#65a30d','#be123c','#4f46e5','#b45309','#0f766e'];

function MapView() {
  const { state, dispatch } = useApp();
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const markersRef = useRef([]);
  const regionsLayerRef = useRef([]);

  const MAP_FILTERS = [
    { key:'visited',   label:'Visited',        color:'#10b981', desc:'Last visit < 14 days' },
    { key:'followup',  label:'Needs follow-up', color:'#f59e0b', desc:'Last visit 14–60 days' },
    { key:'atrisk',    label:'At risk',         color:'#ef4444', desc:'No visit or > 60 days' },
    { key:'listed',    label:'Listed',          color:'#8b5cf6', desc:'Status = Listed' },
  ];

  const [active, setActive] = useState(new Set(['visited','followup','atrisk','listed']));
  const [visibleAccs, setVisibleAccs] = useState([]);

  function toggleFilter(key) {
    setActive(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function classifyAcc(acc) {
    const vd  = daysSince(acc.lastVisit);
    const tags = new Set();
    if (acc.lastVisit && vd < 14) tags.add('visited');
    else if (acc.lastVisit && vd < 60) tags.add('followup');
    else tags.add('atrisk');
    if (acc.status === 'Listed') tags.add('listed');
    return tags;
  }

  function dotColor(tags) {
    if (tags.has('listed'))  return '#8b5cf6';
    if (tags.has('visited')) return '#10b981';
    if (tags.has('followup'))return '#f59e0b';
    return '#ef4444';
  }

  // Init map tile layer once
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    if (typeof L === 'undefined') return;
    try {
      mapInst.current = L.map(mapRef.current, { zoomControl:true }).setView([51, -115], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(mapInst.current);
    } catch(e) { console.error('Map init error', e); }
    return () => { if(mapInst.current){ mapInst.current.remove(); mapInst.current=null; } };
  }, []);

  // Draw region territory polygons
  useEffect(() => {
    if (!mapInst.current || typeof L === 'undefined') return;
    regionsLayerRef.current.forEach(l => l.remove());
    regionsLayerRef.current = [];
    (state.regions || []).forEach((r, i) => {
      if (!r.boundary || r.boundary.length < 3) return;
      const color = r.color || REGION_COLORS[i % REGION_COLORS.length];
      const poly = L.polygon(r.boundary, {
        color, fillColor: color, fillOpacity: 0.10, weight: 2, opacity: 0.6,
      }).addTo(mapInst.current);
      poly.bindTooltip(`<b style="font-size:12px">${r.name}</b>`, { permanent:false, direction:'center', className:'leaflet-tooltip' });
      regionsLayerRef.current.push(poly);
    });
  }, [state.regions, mapInst.current]);

  // Re-draw markers and update list whenever filters or accounts change
  useEffect(() => {
    const shown = [];
    if (mapInst.current && typeof L !== 'undefined') {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      state.accounts.forEach(acc => {
        if (!acc.lat || !acc.lng) return;
        const tags  = classifyAcc(acc);
        const show  = [...tags].some(t => active.has(t));
        if (!show) return;
        const color = dotColor(tags);
        const vd    = daysSince(acc.lastVisit);
        const m = L.circleMarker([acc.lat, acc.lng], { radius:8, fillColor:color, color:'#fff', weight:2, opacity:1, fillOpacity:0.85 })
          .bindPopup(`<div style="font-family:system-ui;min-width:160px">
            <b style="font-size:13px">${acc.name}</b><br>
            <span style="color:#6b7280;font-size:11px">${acc.type} · ${acc.region}</span><br>
            <span style="color:${color};font-size:11px;font-weight:600">${acc.status}</span>
            <span style="color:#6b7280;font-size:11px"> · ${acc.lastVisit ? `Visited ${vd}d ago` : 'Never visited'}</span>
          </div>`)
          .addTo(mapInst.current);
        markersRef.current.push(m);
        shown.push({ acc, tags, color });
      });
    } else {
      // No map (offline) — still build the list
      state.accounts.forEach(acc => {
        const tags = classifyAcc(acc);
        if ([...tags].some(t => active.has(t))) shown.push({ acc, tags, color: dotColor(tags) });
      });
    }
    shown.sort((a,b) => a.acc.name.localeCompare(b.acc.name));
    setVisibleAccs(shown);
  }, [active, state.accounts]);

  const mapped = state.accounts.filter(a => a.lat && a.lng).length;

  return (
    <div className="flex flex-col p-4 gap-3" style={{height:'calc(100vh - 7rem)'}}>
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {MAP_FILTERS.map(f => (
          <button key={f.key} onClick={() => toggleFilter(f.key)} title={f.desc}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active.has(f.key)
                ? 'text-white border-transparent shadow-sm'
                : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-transparent'
            }`}
            style={active.has(f.key) ? { background: f.color } : {}}>
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: active.has(f.key) ? 'rgba(255,255,255,0.65)' : f.color }}/>
            {f.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{visibleAccs.length} of {mapped} shown</span>
      </div>

      {/* Map */}
      <div ref={mapRef} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0" style={{height:'45%'}}/>
      {typeof L === 'undefined' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-sm text-gray-400 flex-shrink-0" style={{height:'45%'}}>
          Map requires an internet connection. GPS coordinates are stored for all accounts.
        </div>
      )}

      {/* Account list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleAccs.length === 0
          ? <div className="text-center text-sm text-gray-400 py-6">No accounts match the active filters.</div>
          : <div className="space-y-1.5">
              {visibleAccs.map(({ acc, color }) => {
                const vd = daysSince(acc.lastVisit);
                const rep = state.users.find(u => u.id === acc.assignedRep);
                return (
                  <button key={acc.id}
                    onClick={() => dispatch({ type:'NAV', view:'account-detail', params:{ id:acc.id } })}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{acc.name}</p>
                      <p className="text-xs text-gray-400 truncate">{acc.type} · {acc.region}{rep ? ` · ${rep.name}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs" style={{ color }}>{acc.lastVisit ? `${vd}d ago` : 'Never'}</span>
                      <Badge label={acc.status}/>
                      <Ic n="chevR" cls="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-teal-500 transition-colors"/>
                    </div>
                  </button>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

// ─── USERS (Admin) ────────────────────────────────────────────────────────────
function UserRow({ u, isMe, isAdmin, dispatch, onEdit }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetPw, setResetPw] = useState('');
  const [forceChange, setForceChange] = useState(true);
  const [resetBusy, setResetBusy] = useState(false);
  async function resetPassword() {
    if (resetPw.length < 8) { showToast(dispatch, 'Password must be at least 8 characters', 'error'); return; }
    setResetBusy(true);
    try {
      const { data: res, error } = await sb.functions.invoke('admin-users', {
        body: { action: 'set_password', userId: u.id, newPassword: resetPw, forceChange },
      });
      if (error || res?.error) throw new Error(res?.error || error.message);
      showToast(dispatch, `🔑 Password reset for ${u.name}${forceChange ? ' — they must pick a new one at next login' : ''}`);
      setShowReset(false); setResetPw('');
    } catch(e) { showToast(dispatch, String(e.message || e), 'error'); }
    finally { setResetBusy(false); }
  }
  const RCOLS = { admin:'bg-teal-600', rep:'bg-blue-500', ambassador:'bg-purple-500' };
  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await dbUploadSellSheet(dispatch, u.id, file); showToast(dispatch, `Sell sheet uploaded for ${u.name}`); }
    catch(err) { showToast(dispatch, 'Upload failed: ' + err.message, 'error'); }
    finally { setUploading(false); e.target.value=''; }
  }
  return (
    <Card cls="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${RCOLS[u.role]||'bg-gray-400'}`}>{u.initials}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
          <p className="text-xs text-gray-400">{u.email} · {(u.regions||[]).join(', ')||'All regions'}</p>
          {isAdmin && u.lastLoginAt && (
            <p className="text-xs text-gray-400 mt-0.5">Last login: {new Date(u.lastLoginAt).toLocaleString('en-CA',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${u.role==='admin'?'bg-teal-100 text-teal-800':u.role==='rep'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{u.role}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${u.active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{u.active?'Active':'Inactive'}</span>
          {isAdmin && (
            <>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload}/>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                title={u.sellSheetPath ? 'Replace sell sheet PDF' : 'Upload sell sheet PDF'}
                className={`p-1.5 rounded-lg transition-colors ${u.sellSheetPath?'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20':'text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}>
                {uploading ? <span className="text-xs">…</span> : <Ic n="file" cls="w-3.5 h-3.5"/>}
              </button>
              <button onClick={()=>onEdit(u)} title="Edit user"
                className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                <Ic n="edit" cls="w-3.5 h-3.5"/>
              </button>
              {!isMe && (
                <button onClick={()=>setShowReset(true)} title="Reset password"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  <Ic n="settings" cls="w-3.5 h-3.5"/>
                </button>
              )}
            </>
          )}
          {!isMe && isAdmin && (
            <button onClick={async ()=>{ if(!confirm(`Remove ${u.name} from the CRM?`)) return; await dbDelUser(dispatch, u.id); showToast(dispatch,`${u.name} removed`); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove user">
              <Ic n="trash" cls="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>
      {/* Password reset modal */}
      <Modal open={showReset} onClose={()=>{ setShowReset(false); setResetPw(''); }} title={`Reset password — ${u.name}`}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Set a temporary password for {u.name} ({u.email}). Share it with them securely — it takes effect immediately.</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Temporary password (min 8 characters)</label>
            <input type="text" value={resetPw} onChange={e=>setResetPw(e.target.value)} placeholder="e.g. Suenos2026!"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={forceChange} onChange={e=>setForceChange(e.target.checked)} className="rounded"/>
            Require them to choose a new password at next login
          </label>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={()=>{ setShowReset(false); setResetPw(''); }}>Cancel</Btn>
            <Btn onClick={resetPassword} disabled={resetBusy || resetPw.length < 8}>{resetBusy ? 'Resetting…' : '🔑 Reset Password'}</Btn>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function MarkListedBtn() {
  const { state, dispatch } = useApp();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const count = await dbMarkOrderedAccountsListed(dispatch, state.accounts, state.orders);
      showToast(dispatch, count > 0 ? `${count} account${count>1?'s':''} marked as Listed` : 'All ordered accounts already Listed or Active');
    } catch(e) {
      console.error('MarkListed error:', e);
      showToast(dispatch, 'Error: ' + e.message);
    }
    setBusy(false);
  }
  return <Btn size="sm" variant="secondary" onClick={run} disabled={busy}>{busy?'Running…':'Run'}</Btn>;
}

// One synced API credential row — reads from localStorage (kept in sync with the DB on login),
// saves via dbSaveApiCred (writes localStorage + app_settings so it reaches every device).
function CredRow({ credKey, label, hint, ph, secret, dispatch }) {
  const [val, setVal] = useState(() => localStorage.getItem(credKey) || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isSet = !!val;
  const masked = secret && isSet ? val.slice(0,6) + '••••••••' + val.slice(-4) : val;
  async function save() {
    setSaving(true);
    try {
      await dbSaveApiCred(credKey, val);
      showToast(dispatch, val ? `${label.replace(/^\S+\s/,'')} saved — synced to all devices` : 'Credential cleared');
      setEditing(false);
    } catch(e) { showToast(dispatch, String(e), 'error'); }
    finally { setSaving(false); }
  }
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}
            {isSet && !editing && <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">✓ SET · SYNCED</span>}
            {!isSet && !editing && <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">NOT SET</span>}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
        </div>
        {!editing && (
          <button onClick={()=>setEditing(true)}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex-shrink-0">{isSet ? 'Edit' : 'Add'}</button>
        )}
      </div>
      {!editing && isSet && (
        <p className="text-[11px] font-mono text-gray-400 mt-1.5 truncate">{masked}</p>
      )}
      {editing && (
        <div className="flex gap-2 mt-2">
          <input type={secret ? 'password' : 'text'} value={val} onChange={e=>setVal(e.target.value)} placeholder={ph}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"/>
          <Btn size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
          <Btn size="sm" variant="ghost" onClick={()=>{ setVal(localStorage.getItem(credKey)||''); setEditing(false); }}>Cancel</Btn>
        </div>
      )}
    </div>
  );
}

function UsersView() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const blank = { name:'', email:'', role:'rep', regions:[] };
  const [form, setForm] = useState(blank);
  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));
  function openEdit(u) {
    setEditForm({ id:u.id, name:u.name, email:u.email, role:u.role, regions:u.regions||[], active:u.active, marketingAlertsEnabled:u.marketingAlertsEnabled!==false });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editForm || !editForm.name) return;
    await dbUpdUser(dispatch, editForm);
    showToast(dispatch, editForm.name + ' updated');
    setEditOpen(false);
  }
  // Notice bar settings — sync from state whenever it loads
  const [noticeText,   setNoticeText]   = useState(state.notice?.text   || '');
  const [noticeActive, setNoticeActive] = useState(state.notice?.active || false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  useEffect(() => {
    setNoticeText(state.notice?.text || '');
    setNoticeActive(state.notice?.active || false);
  }, [state.notice?.text, state.notice?.active]);

  // ── Trade Inquiries settings (House Account + admin notifications) ──────────
  const _ts = state.tradeSettings || {};
  const [tiOwner,    setTiOwner]    = useState(_ts.houseAccountOwnerId || '');
  const [tiNotify,   setTiNotify]   = useState(!!_ts.adminNotifyAll);
  const [tiRecips,   setTiRecips]   = useState(_ts.adminNotifyRecipientIds || []);
  const [tiSaving,   setTiSaving]   = useState(false);
  useEffect(() => {
    setTiOwner(state.tradeSettings?.houseAccountOwnerId || '');
    setTiNotify(!!state.tradeSettings?.adminNotifyAll);
    setTiRecips(state.tradeSettings?.adminNotifyRecipientIds || []);
  }, [state.tradeSettings?.houseAccountOwnerId, state.tradeSettings?.adminNotifyAll, state.tradeSettings?.adminNotifyRecipientIds]);
  const activeUsers  = (state.users || []).filter(u => u.active !== false);
  const activeAdmins = activeUsers.filter(u => u.role === 'admin');
  const tiRecipsClean = tiRecips.filter(id => activeAdmins.some(a => a.id === id)); // drop stale/non-admin
  async function saveTradeSettings() {
    if (tiOwner && !activeUsers.some(u => u.id === tiOwner)) { showToast(dispatch, 'Select an active House Account owner', 'error'); return; }
    setTiSaving(true);
    try {
      await dbSaveTradeSettings(dispatch, { houseAccountOwnerId: tiOwner, adminNotifyAll: tiNotify, adminNotifyRecipientIds: tiRecipsClean });
      showToast(dispatch, 'Trade inquiry settings saved');
    } catch (e) { showToast(dispatch, 'Save failed: ' + (e.message || e), 'error'); }
    finally { setTiSaving(false); }
  }

  // Promo order notification recipients
  const [poRecips, setPoRecips] = useState(state.promoSettings?.orderNotifyRecipientIds || []);
  const [poSaving, setPoSaving] = useState(false);
  useEffect(() => { setPoRecips(state.promoSettings?.orderNotifyRecipientIds || []); }, [state.promoSettings?.orderNotifyRecipientIds]);
  const poRecipsClean = poRecips.filter(id => activeAdmins.some(a => a.id === id));
  async function savePromoSettings() {
    setPoSaving(true);
    try {
      await dbSavePromoSettings(dispatch, { orderNotifyRecipientIds: poRecipsClean });
      showToast(dispatch, 'Promo order recipients saved');
    } catch (e) { showToast(dispatch, 'Save failed: ' + (e.message || e), 'error'); }
    finally { setPoSaving(false); }
  }

  // Brand logo upload state
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [brandLogoError,     setBrandLogoError]     = useState(null);
  const brandLogoRef = React.useRef();

  async function handleBrandLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png','image/jpeg','image/webp','image/svg+xml'];
    if (!allowed.includes(file.type)) { setBrandLogoError('PNG, JPG, WebP or SVG only'); return; }
    setBrandLogoUploading(true); setBrandLogoError(null);
    try {
      await dbUploadBrandLogo(dispatch, file);
    } catch(err) {
      setBrandLogoError(err.message || 'Upload failed');
    } finally {
      setBrandLogoUploading(false);
      if (brandLogoRef.current) brandLogoRef.current.value = '';
    }
  }

  // Map analytics
  const [mapStats,    setMapStats]    = useState(null);
  const [mapLoading,  setMapLoading]  = useState(false);
  const [mapDays,     setMapDays]     = useState(30);
  async function loadMapStats(days) {
    setMapLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [{ data: searches }, { data: clicks }] = await Promise.all([
      sb.from('map_analytics').select('query').eq('event_type','search').gte('created_at', since),
      sb.from('map_analytics').select('account_name, account_id').eq('event_type','click').gte('created_at', since),
    ]);
    // Aggregate searches
    const sqMap = {};
    (searches || []).forEach(r => { const k = (r.query||'').toLowerCase(); sqMap[k] = (sqMap[k]||0)+1; });
    const topSearches = Object.entries(sqMap).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([q,n])=>({q,n}));
    // Aggregate clicks
    const ckMap = {};
    (clicks || []).forEach(r => { const k = r.account_name||r.account_id; ckMap[k] = (ckMap[k]||0)+1; });
    const topClicks = Object.entries(ckMap).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,n])=>({name,n}));
    setMapStats({ topSearches, topClicks, totalSearches: (searches||[]).length, totalClicks: (clicks||[]).length });
    setMapLoading(false);
  }

  // Tax settings — sync from state
  const [taxEnabled,  setTaxEnabled]  = useState(state.taxSettings?.enabled  ?? true);
  const [taxPstRate,  setTaxPstRate]  = useState(String(state.taxSettings?.pstRate ?? 10));
  const [taxGstRate,  setTaxGstRate]  = useState(String(state.taxSettings?.gstRate ?? 7));
  const [taxSaving,   setTaxSaving]   = useState(false);
  useEffect(() => {
    setTaxEnabled(state.taxSettings?.enabled  ?? true);
    setTaxPstRate(String(state.taxSettings?.pstRate ?? 10));
    setTaxGstRate(String(state.taxSettings?.gstRate ?? 7));
  }, [state.taxSettings?.enabled, state.taxSettings?.pstRate, state.taxSettings?.gstRate]);

  async function saveTaxSettings() {
    setTaxSaving(true);
    await dbSaveTaxSettings(dispatch, { enabled: taxEnabled, pstRate: parseFloat(taxPstRate)||0, gstRate: parseFloat(taxGstRate)||0 });
    showToast(dispatch, 'Tax settings saved');
    setTaxSaving(false);
  }

  // Province tax rates — editable table
  const buildProvRates = (customRates) => {
    const r = {};
    PROVINCE_OPTIONS.forEach(p => {
      const c = customRates?.[p.value];
      const d = PROVINCE_TAX[p.value] || { pstRate:0, gstRate:5 };
      r[p.value] = {
        pstRate: c?.pstRate !== undefined ? String(c.pstRate) : String(d.pstRate),
        gstRate: c?.gstRate !== undefined ? String(c.gstRate) : String(d.gstRate),
      };
    });
    return r;
  };
  const [provRates, setProvRates] = useState(() => buildProvRates(state.provinceTaxRates));
  const [provRatesSaving, setProvRatesSaving] = useState(false);
  useEffect(() => { setProvRates(buildProvRates(state.provinceTaxRates)); }, [state.provinceTaxRates]);
  async function saveProvRates() {
    setProvRatesSaving(true);
    const rates = {};
    Object.entries(provRates).forEach(([prov, r]) => {
      rates[prov] = { pstRate: parseFloat(r.pstRate)||0, gstRate: parseFloat(r.gstRate)||0 };
    });
    await dbSaveProvinceTaxRates(dispatch, rates);
    showToast(dispatch, 'Province tax rates saved');
    setProvRatesSaving(false);
  }

  // Invoice footer
  const [invoiceFooterText, setInvoiceFooterText] = useState(state.invoiceFooter || '');
  const [footerSaving, setFooterSaving] = useState(false);
  useEffect(() => { setInvoiceFooterText(state.invoiceFooter || ''); }, [state.invoiceFooter]);
  // Bottle deposit (per-bottle, tax-exempt)
  const [depositInput, setDepositInput] = useState(String(state.bottleDeposit ?? 0));
  const [depositSaving, setDepositSaving] = useState(false);
  useEffect(() => { setDepositInput(String(state.bottleDeposit ?? 0)); }, [state.bottleDeposit]);
  async function saveDeposit() {
    setDepositSaving(true);
    try { await dbSaveBottleDeposit(dispatch, parseFloat(depositInput) || 0); showToast(dispatch, 'Bottle deposit saved'); }
    catch(e) { showToast(dispatch, String(e), 'error'); }
    finally { setDepositSaving(false); }
  }
  // Voice & Tone
  const [voiceToneText, setVoiceToneText] = useState(state.voiceTone || '');
  const [voiceToneSaving, setVoiceToneSaving] = useState(false);
  useEffect(() => { setVoiceToneText(state.voiceTone || ''); }, [state.voiceTone]);
  const VP_DEFAULT = { tone:'balanced', humour:'subtle', formality:'balanced', emoji:'light', spanish:'light', banned:'', examples:'' };
  const [vp, setVp] = useState({ ...VP_DEFAULT, ...(state.voiceProfile || {}) });
  const [vpSaving, setVpSaving] = useState(false);
  useEffect(() => { setVp({ ...VP_DEFAULT, ...(state.voiceProfile || {}) }); }, [state.voiceProfile]);
  async function saveVoiceProfile() {
    setVpSaving(true);
    try { await dbSaveVoiceProfile(dispatch, vp); showToast(dispatch, '✨ Brand voice saved'); }
    catch(e) { showToast(dispatch, String(e), 'error'); }
    finally { setVpSaving(false); }
  }
  // Import a voice & tone guide document (.pdf / .docx / .txt / .md) → extract text → save
  const [vtImporting, setVtImporting] = useState(false);
  function loadScriptOnce(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  async function importVoiceGuide(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVtImporting(true);
    try {
      let text = '';
      const name = file.name.toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.md')) {
        text = await file.text();
      } else if (name.endsWith('.pdf')) {
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const parts = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          parts.push(content.items.map(it => it.str).join(' '));
        }
        text = parts.join('\n\n');
      } else if (name.endsWith('.docx')) {
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
        const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else {
        throw new Error('Please use a .pdf, .docx, .txt, or .md file');
      }
      text = text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 12000);
      if (!text) throw new Error('No readable text found in that file');
      setVoiceToneText(text);
      await dbSaveVoiceTone(dispatch, text);
      showToast(dispatch, `📖 "${file.name}" imported and saved as the voice guide (${text.length.toLocaleString()} chars)`);
    } catch (err) {
      showToast(dispatch, String(err.message || err), 'error');
    } finally {
      setVtImporting(false);
      e.target.value = '';
    }
  }
  // AI Copy — Anthropic API key (localStorage only, never sent to server)
  // (API credentials are managed by CredRow components — synced via app_settings)
  async function saveInvoiceFooter() {
    setFooterSaving(true);
    await dbSaveInvoiceFooter(dispatch, invoiceFooterText);
    showToast(dispatch, 'Invoice footer saved');
    setFooterSaving(false);
  }
  async function saveVoiceTone() {
    setVoiceToneSaving(true);
    await dbSaveVoiceTone(dispatch, voiceToneText);
    showToast(dispatch, 'Voice & Tone saved');
    setVoiceToneSaving(false);
  }

  async function saveNotice() {
    setNoticeSaving(true);
    await dbSaveNotice(dispatch, noticeText, noticeActive);
    showToast(dispatch, 'Notice bar updated');
    setNoticeSaving(false);
  }
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function save() {
    if(!form.name||!form.email) return;
    setBusy(true); setErr('');
    const initials = form.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

    // Step 1: profile already exists (active or deactivated) — just update it
    const { data: existing } = await sb.from('profiles').select('id').eq('email', form.email).maybeSingle();
    if (existing) {
      const { error } = await sb.from('profiles').update({
        name: form.name, role: form.role, regions: form.regions||[], initials, active: true
      }).eq('id', existing.id);
      if (error) { setErr('Update failed: ' + error.message); setBusy(false); return; }
      dispatch({ type:'ADD_USER', payload:{ id:existing.id, name:form.name, email:form.email, role:form.role, regions:form.regions||[], initials, active:true } });
      showToast(dispatch, `${form.name} reactivated`);
      setForm(blank); setOpen(false); setBusy(false);
      return;
    }

    // Step 2: truly new — sign up and wait for DB trigger to create the profile
    const tempPwd = 'Tmp' + Math.random().toString(36).slice(2,10) + 'A1!';
    const { data: { session: adminSession } } = await sb.auth.getSession();
    const { data: authData, error: authErr } = await sb.auth.signUp({
      email: form.email, password: tempPwd,
      options: { data: { name: form.name } }
    });
    if (authData?.session && adminSession) {
      await sb.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
    }
    if (authErr) { setErr(authErr.message); setBusy(false); return; }

    // Step 3: wait up to 3s for trigger, then find the real profile by email
    let profile = null;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      const { data } = await sb.from('profiles').select('id').eq('email', form.email).maybeSingle();
      if (data) { profile = data; break; }
    }

    if (!profile) {
      setErr('This email already exists in Supabase auth but has no profile. Go to Supabase Dashboard → Authentication → Users, delete this email, then try again.');
      setBusy(false);
      return;
    }

    await sb.from('profiles').update({
      name: form.name, role: form.role, regions: form.regions||[], initials, active: true
    }).eq('id', profile.id);

    dispatch({ type:'ADD_USER', payload:{ id:profile.id, name:form.name, email:form.email, role:form.role, regions:form.regions||[], initials, active:true } });
    showToast(dispatch, `${form.name} invited — they'll receive a confirmation email`);
    setForm(blank); setOpen(false); setBusy(false);
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">

      {/* ── MAP ANALYTICS ── */}
      <Card cls="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🗺 Store Locator Analytics</p>
          <div className="flex items-center gap-2">
            <select value={mapDays} onChange={e=>{ const d=Number(e.target.value); setMapDays(d); if(mapStats) loadMapStats(d); }}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <Btn size="sm" onClick={()=>loadMapStats(mapDays)} disabled={mapLoading}>
              {mapLoading ? 'Loading…' : mapStats ? '↻ Refresh' : 'Load Stats'}
            </Btn>
          </div>
        </div>
        {!mapStats && !mapLoading && (
          <p className="text-xs text-gray-400 text-center py-4">Click "Load Stats" to see search and click data from the public store locator map.</p>
        )}
        {mapLoading && <p className="text-xs text-gray-400 text-center py-4">Loading…</p>}
        {mapStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="col-span-full flex gap-4 text-center mb-1">
              <div className="flex-1 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{mapStats.totalSearches}</p>
                <p className="text-xs text-gray-500 mt-0.5">Searches</p>
              </div>
              <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{mapStats.totalClicks}</p>
                <p className="text-xs text-gray-500 mt-0.5">Account clicks</p>
              </div>
            </div>
            {/* Top searches */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Top search terms</p>
              {mapStats.topSearches.length === 0
                ? <p className="text-xs text-gray-400 italic">No searches yet</p>
                : mapStats.topSearches.map(({q,n}) => (
                  <div key={q} className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden h-5 relative">
                      <div className="absolute inset-y-0 left-0 bg-teal-400/40 dark:bg-teal-600/40 rounded-full"
                        style={{width:`${Math.round(n/mapStats.topSearches[0].n*100)}%`}}/>
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-gray-700 dark:text-gray-300">{q}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-6 text-right">{n}</span>
                  </div>
                ))
              }
            </div>
            {/* Top clicked accounts */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Most clicked accounts</p>
              {mapStats.topClicks.length === 0
                ? <p className="text-xs text-gray-400 italic">No clicks yet</p>
                : mapStats.topClicks.map(({name,n}) => (
                  <div key={name} className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden h-5 relative">
                      <div className="absolute inset-y-0 left-0 bg-purple-400/40 dark:bg-purple-600/40 rounded-full"
                        style={{width:`${Math.round(n/mapStats.topClicks[0].n*100)}%`}}/>
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-6 text-right">{n}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </Card>

      {/* ── DATA TOOLS ── */}
      <Card cls="p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🔧 Data Tools</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Mark ordered accounts as Listed</p>
            <p className="text-xs text-gray-400 mt-0.5">Promotes any account with an order in the past year from Prospect / Sample Sent / Buyer Meeting / Listing Pending → Listed</p>
          </div>
          <MarkListedBtn/>
        </div>
      </Card>

      {/* ── NOTICE BAR SETTINGS ── */}
      <Card cls="p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🥃 Notice Bar</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <textarea
              value={noticeText}
              onChange={e=>setNoticeText(e.target.value)}
              rows={2}
              placeholder="e.g. New product drop this Friday — ask your accounts!"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={()=>setNoticeActive(v=>!v)}
                className={`w-10 h-5 rounded-full transition-colors relative ${noticeActive?'bg-amber-500':'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${noticeActive?'translate-x-5':'translate-x-0.5'}`}/>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{noticeActive ? 'Visible to all users' : 'Hidden'}</span>
            </label>
            <Btn size="sm" onClick={saveNotice} disabled={noticeSaving}>
              {noticeSaving ? 'Saving…' : 'Save'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* ── TRADE INQUIRIES ── */}
      <Card cls="p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🤝 Trade Inquiries</p>

        {/* House Account routing */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">House Account Routing</p>
          <p className="text-xs text-gray-500 mb-2">Fallback owner for any accepted inquiry that doesn't resolve to an eligible sales rep (used after local → provincial → national).</p>
          <label className="block text-xs font-medium text-gray-500 mb-1">House Account Owner</label>
          <select value={tiOwner} onChange={e=>setTiOwner(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 outline-none">
            <option value="">— Not configured —</option>
            {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}{u.role==='admin'?' (admin)':''} · {u.email}</option>)}
          </select>
          {tiOwner
            ? <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">✓ Fallback leads, tasks and internal notifications route to {activeUsers.find(u=>u.id===tiOwner)?.name || 'this owner'}.</p>
            : <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">⚠️ No House Account configured — unresolved leads would be created unowned. Choose an owner.</p>}
        </div>

        {/* Admin notifications */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Admin Notifications</p>
          <label className="flex items-center gap-2 cursor-pointer mb-1">
            <div onClick={()=>setTiNotify(v=>!v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${tiNotify?'bg-teal-500':'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tiNotify?'translate-x-5':'translate-x-0.5'}`}/>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Notify admins of every new trade inquiry</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">Selected admins will receive a copy of every accepted trade inquiry, regardless of which sales representative or House Account receives the lead.</p>

          {tiNotify && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Notification Recipients</label>
              {activeAdmins.length === 0
                ? <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ No active admin users to select.</p>
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 max-h-48 overflow-auto">
                    {activeAdmins.map(a => (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={tiRecips.includes(a.id)}
                          onChange={e=>setTiRecips(e.target.checked ? [...tiRecips, a.id] : tiRecips.filter(x=>x!==a.id))}
                          className="w-3.5 h-3.5 rounded accent-teal-600"/>
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{a.name} · {a.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              {tiRecipsClean.length === 0 && activeAdmins.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">⚠️ Notifications are on but no recipients are selected — no admin emails will be sent.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Btn size="sm" onClick={saveTradeSettings} disabled={tiSaving}>
            {tiSaving ? 'Saving…' : 'Save Trade Settings'}
          </Btn>
        </div>
      </Card>

      {/* ── PROMO ORDER NOTIFICATIONS ── */}
      <Card cls="p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📦 Promo Order Notifications</p>
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-1">Who receives promo material order emails</p>
        <p className="text-xs text-gray-500 mb-3">When a rep submits a promo material order, only the people selected here get the notification email. Leave everyone unchecked to fall back to all admins.</p>
        {activeAdmins.length === 0
          ? <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ No active admin users to select.</p>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 max-h-48 overflow-auto">
              {activeAdmins.map(a => (
                <label key={a.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={poRecips.includes(a.id)}
                    onChange={e=>setPoRecips(e.target.checked ? [...poRecips, a.id] : poRecips.filter(x=>x!==a.id))}
                    className="w-3.5 h-3.5 rounded accent-teal-600"/>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{a.name} · {a.email}</span>
                </label>
              ))}
            </div>
          )}
        {poRecipsClean.length === 0 && activeAdmins.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">No one selected — promo orders will notify all admins.</p>
        )}
        <div className="flex justify-end mt-4">
          <Btn size="sm" onClick={savePromoSettings} disabled={poSaving}>
            {poSaving ? 'Saving…' : 'Save Promo Recipients'}
          </Btn>
        </div>
      </Card>

      {/* ── BRAND LOGO ── */}
      <Card cls="p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🎨 Brand Logo (Sueños)</p>
        <p className="text-xs text-gray-500 mb-3">Uploaded once — composited onto every Ad Creative image. Use a PNG with transparent background for best results.</p>
        <div className="flex items-center gap-4 flex-wrap">
          {state.brandLogoUrl ? (
            <div className="relative w-24 h-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
              <img src={state.brandLogoUrl} alt="Sueños brand logo" className="max-w-full max-h-full object-contain p-1"/>
            </div>
          ) : (
            <div className="w-24 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <span className="text-2xl">🏷️</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input ref={brandLogoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden" onChange={handleBrandLogoUpload}/>
            <button onClick={()=>brandLogoRef.current?.click()}
              disabled={brandLogoUploading}
              className="text-xs px-4 py-1.5 rounded-lg text-white font-medium transition disabled:opacity-50"
              style={{background:'#1B7873'}}>
              {brandLogoUploading ? 'Uploading…' : state.brandLogoUrl ? '↑ Replace Logo' : '↑ Upload Logo'}
            </button>
            {state.brandLogoUrl && (
              <p className="text-[10px] text-green-600 font-medium">✓ Logo uploaded</p>
            )}
            {brandLogoError && <p className="text-[10px] text-red-500">{brandLogoError}</p>}
          </div>
        </div>
      </Card>

      {/* ── TAX SETTINGS ── */}
      <Card cls="p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🧾 Tax Settings</p>
        <div className="space-y-4">
          {/* Enable / disable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Apply taxes to orders</p>
              <p className="text-xs text-gray-400 mt-0.5">When enabled, PST and GST are calculated on the order form</p>
            </div>
            <div onClick={()=>setTaxEnabled(v=>!v)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${taxEnabled?'bg-teal-500':'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${taxEnabled?'translate-x-5':'translate-x-0.5'}`}/>
            </div>
          </div>
          {/* Rate inputs */}
          <div className={`grid grid-cols-2 gap-3 transition-opacity ${taxEnabled?'opacity-100':'opacity-40 pointer-events-none'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">PST Rate (%)</label>
              <input type="number" min="0" max="30" step="0.1"
                value={taxPstRate} onChange={e=>setTaxPstRate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">GST Rate (%)</label>
              <input type="number" min="0" max="30" step="0.1"
                value={taxGstRate} onChange={e=>setTaxGstRate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none"/>
            </div>
          </div>
          {taxEnabled && (
            <p className="text-xs text-gray-400">
              Combined rate: {(parseFloat(taxPstRate)||0) + (parseFloat(taxGstRate)||0)}%
              &nbsp;· Orders will show subtotal, PST, GST, and total
            </p>
          )}
          <div className="flex justify-end">
            <Btn size="sm" onClick={saveTaxSettings} disabled={taxSaving}>
              {taxSaving ? 'Saving…' : 'Save Tax Settings'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Province Tax Rates */}
      <Card cls="p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🗺️ Province Tax Rates</p>
        <p className="text-xs text-gray-400 mb-3">Set the exact rates for each province. For wholesale, PST is often 0%. Set both to 0 to show no tax for a province.</p>
        <div className="overflow-x-auto">
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-3">Province</th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-3">PST %</th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-3">GST / HST %</th>
                <th className="text-right text-xs font-semibold text-gray-400 pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {PROVINCE_OPTIONS.map(p => {
                const pst = parseFloat(provRates[p.value]?.pstRate)||0;
                const gst = parseFloat(provRates[p.value]?.gstRate)||0;
                return (
                  <tr key={p.value} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="py-1.5 pr-3">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.value}</span>
                      <span className="text-xs text-gray-400 ml-1 hidden sm:inline">{p.label.split('—')[1]?.trim()}</span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <input type="number" min="0" max="30" step="0.1"
                        value={provRates[p.value]?.pstRate ?? ''}
                        onChange={e=>setProvRates(r=>({...r,[p.value]:{...r[p.value],pstRate:e.target.value}}))}
                        className="w-16 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center"/>
                    </td>
                    <td className="py-1.5 pr-3">
                      <input type="number" min="0" max="30" step="0.1"
                        value={provRates[p.value]?.gstRate ?? ''}
                        onChange={e=>setProvRates(r=>({...r,[p.value]:{...r[p.value],gstRate:e.target.value}}))}
                        className="w-16 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center"/>
                    </td>
                    <td className="py-1.5 text-right">
                      <span className={`text-xs font-medium ${pst+gst===0?'text-gray-300 dark:text-gray-600':'text-gray-700 dark:text-gray-300'}`}>{(pst+gst).toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3">
          <Btn size="sm" onClick={saveProvRates} disabled={provRatesSaving}>
            {provRatesSaving ? 'Saving…' : 'Save Province Rates'}
          </Btn>
        </div>
      </Card>

      {/* Invoice Footer */}
      <Card cls="p-4 mb-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📄 Invoice Footer</p>
          <p className="text-xs text-gray-500">This text appears at the bottom of every invoice. Use it for payment terms, return policies, or contact info.</p>
          <textarea
            rows={3}
            value={invoiceFooterText}
            onChange={e=>setInvoiceFooterText(e.target.value)}
            placeholder="e.g. Payment due within 30 days. Thank you for your business!"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex justify-end">
            <Btn size="sm" onClick={saveInvoiceFooter} disabled={footerSaving}>
              {footerSaving ? 'Saving…' : 'Save Footer'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Bottle Deposit */}
      <Card cls="p-4 mb-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🍾 Bottle Deposit</p>
          <p className="text-xs text-gray-500">Flat container deposit charged per bottle on every invoice (tax-exempt, added after PST/GST). Set to 0 to disable.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input type="number" step="0.01" min="0" value={depositInput} onChange={e=>setDepositInput(e.target.value)}
              placeholder="0.10"
              className="w-32 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <span className="text-xs text-gray-400">per bottle</span>
          </div>
          <div className="flex justify-end">
            <Btn size="sm" onClick={saveDeposit} disabled={depositSaving}>{depositSaving ? 'Saving…' : 'Save Deposit'}</Btn>
          </div>
        </div>
      </Card>

      {/* Brand Voice — structured AI writer controls */}
      <Card cls="p-4 mb-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🎛 Brand Voice Controls</p>
            <p className="text-xs text-gray-500">Dial in exactly how the AI writer sounds. These apply to every generated ad, on every device.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key:'tone', label:'Overall Tone', opts:[['premium','Premium & refined'],['balanced','Balanced'],['playful','Playful & bold']] },
              { key:'humour', label:'Humour', opts:[['none','None'],['subtle','Subtle wit'],['playful','Playful'],['cheeky','Cheeky']] },
              { key:'formality', label:'Formality', opts:[['casual','Casual'],['balanced','Balanced'],['polished','Polished']] },
              { key:'emoji', label:'Emoji Use', opts:[['none','None'],['light','Light (max 1)'],['generous','Generous (2–3)']] },
              { key:'spanish', label:'Spanish Flavour', opts:[['none','English only'],['light','Light touch'],['bold','Proudly Mexican']] },
            ].map(f=>(
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
                <select value={vp[f.key]} onChange={e=>setVp(x=>({...x,[f.key]:e.target.value}))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">🚫 Banned words &amp; phrases <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input type="text" value={vp.banned} onChange={e=>setVp(x=>({...x,banned:e.target.value}))}
              placeholder='e.g. "booze", "get wasted", "cheap", corporate jargon'
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">⭐ Example ads you love <span className="font-normal text-gray-400">(one per line — the AI matches their style)</span></label>
            <textarea rows={4} value={vp.examples} onChange={e=>setVp(x=>({...x,examples:e.target.value}))}
              placeholder={'The bartenders of Vancouver already know. Now it’s your turn. 🌵\nSmall-batch. Big weekend. Suénos is on the shelf.'}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          </div>
          <div className="flex justify-end">
            <Btn size="sm" onClick={saveVoiceProfile} disabled={vpSaving}>
              {vpSaving ? 'Saving…' : 'Save Brand Voice'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Voice & Tone Instructions */}
      <Card cls="p-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🎙 Voice &amp; Tone</p>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${vtImporting ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
              {vtImporting
                ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full"></span> Reading…</>
                : '📖 Upload Guide'}
              <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={importVoiceGuide} disabled={vtImporting}/>
            </label>
          </div>
          <p className="text-xs text-gray-500">Paste your brand voice and tone guidelines here, or upload your Sueños voice guide (PDF, Word, or text) — the text is extracted and saved automatically. The AI writer references it for every ad, on every device.</p>
          <textarea
            rows={8}
            value={voiceToneText}
            onChange={e=>setVoiceToneText(e.target.value)}
            placeholder={"e.g.\nBrand voice: Bold, authentic, and rooted in Mexican culture. We speak with confidence but never arrogance.\n\nTone: Warm and inviting for lifestyle ads. Sophisticated for on-trade. Playful for social.\n\nAvoid: Corporate jargon, clichés, aggressive sales language.\n\nKeywords to use: Craft, heritage, agave, celebration, community."}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{voiceToneText.length} characters</p>
            <Btn size="sm" onClick={saveVoiceTone} disabled={voiceToneSaving}>
              {voiceToneSaving ? 'Saving…' : 'Save Voice & Tone'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* API Credentials — synced to all devices via the database */}
      <Card cls="p-4 mb-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🔐 API Credentials</p>
            <p className="text-xs text-gray-500">All keys are stored in your Supabase database and sync automatically to every device you log in on. Save once, use anywhere.</p>
          </div>
          {[
            { k:'anthropic_api_key', label:'✨ Anthropic API Key', hint:'Powers the AI ad writer. Get it at console.anthropic.com → API Keys', ph:'sk-ant-api03-…', secret:true },
            { k:'meta_access_token', label:'📣 Meta Access Token', hint:'Powers Push to Meta + Ad Performance. From Meta Business → System User tokens', ph:'EAAG…', secret:true },
            { k:'meta_page_id',      label:'📄 Facebook Page ID', hint:'FB Page → About → Page Transparency', ph:'e.g. 123456789012345', secret:false },
            { k:'meta_website_url',  label:'🔗 Ad Website URL', hint:'Default landing URL for ads', ph:'https://suenostequila.com', secret:false },
            { k:'spotify_ad_account_id', label:'🎧 Spotify Ad Account ID', hint:'From your Ads Manager URL (…?adAccountId=THIS). Lets the CRM skip account auto-discovery.', ph:'64bdcf4b-…', secret:false },
          ].map(c=>(
            <CredRow key={c.k} credKey={c.k} label={c.label} hint={c.hint} ph={c.ph} secret={c.secret} dispatch={dispatch}/>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{state.users.length} users</p>
        <Btn onClick={()=>{ setForm(blank); setErr(''); setOpen(true); }}><Ic n="plus" cls="w-4 h-4"/> Add User</Btn>
      </div>
      <div className="space-y-2">
        {state.users.map(u=>(
          <UserRow key={u.id} u={u} isMe={u.id===state.user?.id} isAdmin={state.user?.role==='admin'} dispatch={dispatch} onEdit={openEdit}/>
        ))}
      </div>
      <Modal open={open} onClose={()=>{ setOpen(false); setBusy(false); }} title="Invite User">
        <div className="space-y-3">
          <FInput label="Full Name" value={form.name} onChange={v=>set('name',v)} required/>
          <FInput label="Email" value={form.email} onChange={v=>set('email',v)} type="email" required/>
          <FSelect label="Role" value={form.role} onChange={v=>set('role',v)} options={['admin','rep','ambassador']}/>
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Regions</p>
            <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              {(state.regions?.length?state.regions.map(r=>r.name):REGIONS).map(r=>(
                <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={(form.regions||[]).includes(r)}
                    onChange={e=>set('regions', e.target.checked ? [...(form.regions||[]),r] : (form.regions||[]).filter(x=>x!==r))}
                    className="w-3.5 h-3.5 rounded accent-teal-600"/>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{r}</span>
                </label>
              ))}
            </div>
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">A confirmation email will be sent. The user clicks the link, then uses <strong>Forgot Password</strong> to set their own password.</p>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" onClick={()=>setOpen(false)} cls="flex-1">Cancel</Btn>
            <Btn onClick={save} cls="flex-1" disabled={!form.name||!form.email||busy}>{busy?'Creating…':'Send Invite'}</Btn>
          </div>
        </div>
      </Modal>

      {/* ── EDIT USER MODAL ── */}
      {editForm && (
        <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit User">
          <div className="space-y-3">
            <FInput label="Full Name" value={editForm.name} onChange={v=>setE('name',v)} required/>
            <p className="text-xs text-gray-400 -mt-1">Email: {editForm.email} (cannot be changed)</p>
            <FSelect label="Role" value={editForm.role} onChange={v=>setE('role',v)} options={['admin','rep','ambassador']}/>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Regions</p>
              <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                {(state.regions && state.regions.length ? state.regions.map(r=>r.name) : REGIONS).map(r=>(
                  <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={(editForm.regions||[]).includes(r)}
                      onChange={e=>setE('regions', e.target.checked ? [...(editForm.regions||[]),r] : (editForm.regions||[]).filter(x=>x!==r))}
                      className="w-3.5 h-3.5 rounded accent-teal-600"/>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.active}
                onChange={e=>setE('active', e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-teal-600"/>
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.marketingAlertsEnabled}
                onChange={e=>setE('marketingAlertsEnabled', e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-teal-600 mt-0.5"/>
              <span className="text-sm text-gray-700 dark:text-gray-300">Receives marketing alerts
                <span className="block text-xs text-gray-400">Declining-ad performance emails. Works for any role.</span>
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <Btn variant="secondary" onClick={()=>setEditOpen(false)} cls="flex-1">Cancel</Btn>
              <Btn onClick={saveEdit} cls="flex-1" disabled={!editForm.name}>Save Changes</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TARGETS (Admin) ──────────────────────────────────────────────────────────
function TargetsView() {
  const { state, dispatch } = useApp();
  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0,7));
  const reps = state.users.filter(u=>u.role==='rep');
  const [forms, setForms] = useState({});
  useEffect(()=>{
    const init = {};
    reps.forEach(u=>{ const ex=state.targets.find(t=>t.repId===u.id&&t.month===month); init[u.id]=ex||{visits:20,newAccounts:3,newListings:2,bottles:300,revenue:21000}; });
    setForms(init);
  },[month, state.targets]);
  function save(repId) { dbSetTarget(dispatch,{...forms[repId],id:genId(),repId,month}); showToast(dispatch,'Target saved'); }
  const setField = (rid,k,v) => setForms(f=>({...f,[rid]:{...f[rid],[k]:v}}));
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month</label>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400"/>
      </div>
      <div className="space-y-4">
        {reps.map(u=>(
          <Card key={u.id} cls="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">{u.initials}</div>
              <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p><p className="text-xs text-gray-400">{(u.regions||[]).join(', ')||'All regions'}</p></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[{k:'visits',l:'Visits'},{k:'newAccounts',l:'New Accs'},{k:'newListings',l:'Listings'},{k:'bottles',l:'Bottles'},{k:'revenue',l:'Revenue $'}].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs text-gray-400 mb-1">{f.l}</label>
                  <input type="number" value={forms[u.id]?.[f.k]||''} onChange={e=>setField(u.id,f.k,parseInt(e.target.value)||0)} className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400"/>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end"><Btn size="sm" onClick={()=>save(u.id)}>Save Targets</Btn></div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── SALES IMPORT ─────────────────────────────────────────────────────────────
function SalesImportView() {
  const { state, dispatch } = useApp();
  const defaultProductId = state.products.find(p=>p.name.toLowerCase().includes('blanco'))?.id || state.products[0]?.id || '';
  const blankRow = {month:'',accountId:'',productId:defaultProductId,bottles:'',revenue:'',repId:''};
  const [rows, setRows] = useState([{month:'',accountId:'',productId:'',bottles:'',revenue:'',repId:''}]);
  const [saving, setSaving] = useState(false);
  // Pre-select default product when products load
  useEffect(()=>{
    if(defaultProductId) setRows(r=>r.map(row=>row.productId?row:{...row,productId:defaultProductId}));
  },[defaultProductId]);
  const [fRep, setFRep] = useState('');
  const [fMonth, setFMonth] = useState('');
  // Edit modal state
  const [editing, setEditing] = useState(null); // sale object being edited
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const addRow = () => setRows(r=>[...r,{...blankRow}]);
  const delRow = i => setRows(r=>r.filter((_,j)=>j!==i));
  const setCell = (i,k,v) => setRows(r=>r.map((row,j)=>j===i?{...row,[k]:v}:row));
  const reps = state.users.filter(u=>['rep','ambassador'].includes(u.role)&&u.active!==false);
  const iCls = "w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white";
  const fCls  = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none";

  async function submit() {
    const valid = rows.filter(r=>r.month&&r.accountId&&r.productId&&r.bottles);
    if(!valid.length) return;
    setSaving(true);
    const records = valid.map(r=>({id:genId(),month:r.month,accountId:r.accountId,productId:r.productId,bottles:parseInt(r.bottles)||0,revenue:parseFloat(r.revenue)||0,repId:r.repId||null}));
    await dbAddSales(dispatch, records);
    setRows([{...blankRow}]);
    showToast(dispatch,`${valid.length} sale${valid.length>1?'s':''} saved`,'success');
    setSaving(false);
  }

  function openEdit(s) {
    setEditing(s);
    setEditForm({ month:s.month, accountId:s.accountId, productId:s.productId, bottles:String(s.bottles), revenue:String(s.revenue||''), repId:s.repId||'' });
  }
  function closeEdit() { setEditing(null); setEditForm(null); }
  async function saveEdit() {
    if (!editForm.month||!editForm.accountId||!editForm.productId||!editForm.bottles) return;
    setEditSaving(true);
    await dbUpdSale(dispatch, { ...editing, month:editForm.month, accountId:editForm.accountId, productId:editForm.productId, bottles:parseInt(editForm.bottles)||0, revenue:parseFloat(editForm.revenue)||0, repId:editForm.repId||null });
    showToast(dispatch,'Sale updated');
    setEditSaving(false);
    closeEdit();
  }
  async function deleteSale(s) {
    if (!confirm(`Delete this sale record for ${state.accounts.find(a=>a.id===s.accountId)?.name||'this account'}?`)) return;
    await dbDelSale(dispatch, s.id);
    showToast(dispatch,'Sale deleted');
  }

  // Filtered history
  const shownSales = [...state.sales]
    .filter(s=>!fRep||s.repId===fRep)
    .filter(s=>!fMonth||s.month===fMonth)
    .sort((a,b)=>b.month.localeCompare(a.month))
    .slice(0,50);
  const totalBottles = shownSales.reduce((s,x)=>s+x.bottles,0);
  const totalRev     = shownSales.reduce((s,x)=>s+x.revenue,0);

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
      {/* Entry form */}
      <Card cls="p-4 mb-5">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Add Sales Records</p>
        <p className="text-xs text-gray-400 mb-3">Each row = one account + product combination for a given month.</p>
        <div className="space-y-2 mb-3">
          {rows.map((row,i)=>(
            <div key={i} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end">
              <div><label className="block text-xs text-gray-400 mb-1">Month *</label><input type="month" value={row.month} onChange={e=>setCell(i,'month',e.target.value)} className={iCls}/></div>
              <div className="sm:col-span-2"><label className="block text-xs text-gray-400 mb-1">Account *</label><select value={row.accountId} onChange={e=>setCell(i,'accountId',e.target.value)} className={iCls}><option value="">—</option>{state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-1">Product *</label><select value={row.productId} onChange={e=>setCell(i,'productId',e.target.value)} className={iCls}><option value="">—</option>{state.products.map(p=><option key={p.id} value={p.id}>{p.name.split(' ').pop()}</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-1">Bottles *</label><input type="number" value={row.bottles} onChange={e=>setCell(i,'bottles',e.target.value)} placeholder="24" className={iCls}/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Revenue $</label><input type="number" value={row.revenue} onChange={e=>setCell(i,'revenue',e.target.value)} placeholder="1440" className={iCls}/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Rep</label>
                <div className="flex gap-1">
                  <select value={row.repId} onChange={e=>setCell(i,'repId',e.target.value)} className={iCls}><option value="">—</option>{reps.map(u=><option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}</select>
                  {rows.length>1 && <button onClick={()=>delRow(i)} className="p-1.5 text-gray-300 hover:text-red-400 transition flex-shrink-0"><Ic n="trash" cls="w-3.5 h-3.5"/></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={addRow}><Ic n="plus" cls="w-3.5 h-3.5"/> Add Row</Btn>
          <Btn onClick={submit} disabled={saving} cls="ml-auto"><Ic n="upload" cls="w-3.5 h-3.5"/> {saving?'Saving…':'Save Records'}</Btn>
        </div>
      </Card>

      {/* Filters + summary */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <p className="text-sm font-semibold text-gray-900 dark:text-white flex-1">Sales History</p>
        {state.sales.length > 0 && (() => {
          const blancoId = state.products.find(p=>p.name.toLowerCase().includes('blanco'))?.id;
          const nonBlanco = state.sales.filter(s=>s.productId!==blancoId).length;
          if (!blancoId || nonBlanco===0) return null;
          return (
            <button onClick={async()=>{
              if(!confirm(`Reassign all ${nonBlanco} non-Blanco sales records to Blanco?`)) return;
              const ok = await dbBulkReassignProduct(dispatch, blancoId, state.sales);
              if(ok) showToast(dispatch, `${nonBlanco} records reassigned to Blanco`);
            }} className="px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition font-medium">
              Fix: Reassign {nonBlanco} to Blanco
            </button>
          );
        })()}
        <select value={fRep} onChange={e=>setFRep(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <option value="">All Reps</option>
          {reps.map(u=><option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
        </select>
        <input type="month" value={fMonth} onChange={e=>setFMonth(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"/>
      </div>
      {shownSales.length>0 && (
        <p className="text-xs text-gray-500 mb-3">{shownSales.length} records · <strong className="text-teal-700">{totalBottles} btl</strong>{totalRev>0?<> · <strong className="text-gray-700 dark:text-gray-300">{fmtCurrency(totalRev)}</strong></>:''}</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {['Month','Account','Product','Rep','Bottles','Revenue',''].map((h,i)=>(
                <th key={i} className="text-left text-gray-400 font-medium px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownSales.length===0
              ? <tr><td colSpan={7} className="text-center text-gray-400 py-8">No sales records yet</td></tr>
              : shownSales.map(s=>{
                  const acc  = state.accounts.find(a=>a.id===s.accountId);
                  const prod = state.products.find(p=>p.id===s.productId);
                  const rep  = state.users.find(u=>u.id===s.repId);
                  return (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition group">
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{s.month}</td>
                      <td className="px-3 py-2 max-w-[140px]">
                        <button
                          onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:s.accountId}})}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate block text-left w-full">
                          {acc?.name||'—'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{prod?.name.split(' ').pop()||'—'}</td>
                      <td className="px-3 py-2 text-gray-400">{rep?.name.split(' ')[0]||'—'}</td>
                      <td className="px-3 py-2 text-teal-700 font-semibold">{s.bottles}</td>
                      <td className="px-3 py-2 text-gray-400">{s.revenue>0?fmtCurrency(s.revenue):'—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={()=>openEdit(s)} className="p-1 text-gray-400 hover:text-teal-600 transition" title="Edit"><Ic n="edit" cls="w-3.5 h-3.5"/></button>
                          <button onClick={()=>deleteSale(s)} className="p-1 text-gray-400 hover:text-red-500 transition" title="Delete"><Ic n="trash" cls="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={closeEdit} title="Edit Sale Record">
        {editForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Month *</label>
                <input type="month" value={editForm.month} onChange={e=>setEditForm(f=>({...f,month:e.target.value}))} className={fCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rep</label>
                <select value={editForm.repId} onChange={e=>setEditForm(f=>({...f,repId:e.target.value}))} className={fCls}>
                  <option value="">— none —</option>
                  {reps.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Account *</label>
              <select value={editForm.accountId} onChange={e=>setEditForm(f=>({...f,accountId:e.target.value}))} className={fCls}>
                <option value="">— select —</option>
                {state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Product *</label>
              <select value={editForm.productId} onChange={e=>setEditForm(f=>({...f,productId:e.target.value}))} className={fCls}>
                <option value="">— select —</option>
                {state.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bottles *</label>
                <input type="number" value={editForm.bottles} onChange={e=>setEditForm(f=>({...f,bottles:e.target.value}))} className={fCls}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Revenue $</label>
                <input type="number" value={editForm.revenue} onChange={e=>setEditForm(f=>({...f,revenue:e.target.value}))} className={fCls}/>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Btn variant="secondary" onClick={closeEdit} cls="flex-1">Cancel</Btn>
              <Btn onClick={saveEdit} cls="flex-1" disabled={editSaving||!editForm.month||!editForm.accountId||!editForm.productId||!editForm.bottles}>
                {editSaving?'Saving…':'Save Changes'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── REGIONS VIEW ───────────────────────────────────────────────
// ─── REGION TERRITORY DRAW MODAL ─────────────────────────────────────────────
function RegionDrawModal({ region, onClose }) {
  const { state, dispatch } = useApp();
  const mapRef  = useRef(null);
  const mapInst = useRef(null);
  const polyRef = useRef(null);
  const lineRef = useRef(null);
  const dotRefs = useRef([]);
  const [pts, setPts]     = useState(region.boundary ? [...region.boundary] : []);
  const [saving, setSaving] = useState(false);
  const color = region.color || REGION_COLORS[(state.regions||[]).findIndex(r=>r.id===region.id) % REGION_COLORS.length];

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    if (typeof L === 'undefined') return;
    const center = pts.length ? pts[0] : [51, -115];
    mapInst.current = L.map(mapRef.current, { zoomControl:true }).setView(center, pts.length ? 8 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM', maxZoom:19 }).addTo(mapInst.current);
    mapInst.current.on('click', e => {
      setPts(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    });
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInst.current || typeof L === 'undefined') return;
    dotRefs.current.forEach(d => d.remove()); dotRefs.current = [];
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    if (lineRef.current) { lineRef.current.remove(); lineRef.current = null; }
    if (pts.length === 0) return;
    pts.forEach((p, i) => {
      const dot = L.circleMarker(p, { radius: i===0?8:6, fillColor: i===0?'#fff':color, color, weight:2, fillOpacity:1 })
        .addTo(mapInst.current);
      dotRefs.current.push(dot);
    });
    if (pts.length >= 3) {
      polyRef.current = L.polygon(pts, { color, fillColor:color, fillOpacity:0.15, weight:2 }).addTo(mapInst.current);
    } else if (pts.length >= 2) {
      lineRef.current = L.polyline(pts, { color, weight:2 }).addTo(mapInst.current);
    }
  }, [pts]);

  async function handleSave() {
    setSaving(true);
    await dbUpdRegion(dispatch, region.id, { boundary: pts, color });
    showToast(dispatch, `Territory saved for ${region.name}`);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background:color}}/>
          <p className="text-white font-semibold">{region.name} — Draw Territory</p>
          <span className="text-xs text-gray-400">Click the map to add boundary points</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setPts(p=>p.slice(0,-1))} disabled={pts.length===0}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 transition">
            ↩ Undo
          </button>
          <button onClick={()=>setPts([])}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition">
            Clear
          </button>
          <button onClick={handleSave} disabled={pts.length < 3 || saving}
            className="px-4 py-1.5 text-xs rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-40 transition">
            {saving ? 'Saving…' : `Save Territory (${pts.length} pts)`}
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      {/* Instructions */}
      <div className="px-4 py-2 bg-gray-800/60 text-xs text-gray-400 flex-shrink-0">
        {pts.length === 0 && 'Click anywhere on the map to start drawing the boundary.'}
        {pts.length === 1 && 'Add more points to define the territory shape.'}
        {pts.length === 2 && 'Add at least one more point to close the polygon.'}
        {pts.length >= 3 && `${pts.length} points — polygon visible. Add more points for precision, then Save.`}
      </div>
      <div ref={mapRef} className="flex-1"/>
    </div>
  );
}

function RegionsView() {
  const { state, dispatch } = useApp();
  const [newName, setNewName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [drawing, setDrawing] = React.useState(null); // region being drawn
  const [editingId, setEditingId] = React.useState(null);
  const [editName, setEditName] = React.useState('');

  async function handleRename(r) {
    const name = editName.trim();
    if (!name || name === r.name) { setEditingId(null); return; }
    await dbUpdRegion(dispatch, r.id, { name });
    showToast(dispatch, `Renamed to "${name}"`);
    setEditingId(null);
  }

  const regions = state.regions || [];

  async function handleAdd(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (regions.find(r => r.name.toLowerCase() === name.toLowerCase())) {
      setErr('Region already exists'); return;
    }
    setBusy(true); setErr('');
    try {
      await dbAddRegion(dispatch, name, regions.length);
      setNewName('');
      showToast(dispatch, `Region "${name}" added`);
    } catch(e) {
      setErr(e.message || 'Failed to add region');
    }
    setBusy(false);
  }

  async function handleDelete(region) {
    if (!confirm(`Delete region "${region.name}"? Existing accounts won't be changed.`)) return;
    await dbDelRegion(dispatch, region.id);
    showToast(dispatch, `Region "${region.name}" removed`);
  }

  return (
    <>
    {drawing && <RegionDrawModal region={drawing} onClose={()=>setDrawing(null)}/>}
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Ic n="pin" cls="w-5 h-5 text-teal-700 dark:text-teal-400"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Regions</h1>
          <p className="text-sm text-gray-500">Manage sales territories · click "Draw Territory" to define boundaries</p>
        </div>
      </div>

      <Card cls="mb-6 p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Add Region</p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setErr(''); }}
            placeholder="e.g. Prince George"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
          <Btn type="submit" disabled={busy || !newName.trim()}>
            <Ic n="plus" cls="w-4 h-4"/> Add
          </Btn>
        </form>
        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      </Card>

      <Card cls="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{regions.length} Region{regions.length !== 1 ? 's' : ''}</p>
        {regions.length === 0 ? (
          <EmptyState icon="pin" title="No regions yet" sub="Add your first sales territory above"/>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {regions.map((r, i) => {
              const color = r.color || REGION_COLORS[i % REGION_COLORS.length];
              const hasBoundary = r.boundary && r.boundary.length >= 3;
              return (
                <li key={r.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background:color}}/>
                    {editingId === r.id ? (
                      <input autoFocus value={editName}
                        onChange={e=>setEditName(e.target.value)}
                        onBlur={()=>handleRename(r)}
                        onKeyDown={e=>{ if(e.key==='Enter') handleRename(r); if(e.key==='Escape') setEditingId(null); }}
                        className="flex-1 px-2 py-0.5 text-sm rounded border border-teal-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{r.name}</span>
                    )}
                    {hasBoundary
                      ? <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">✓ {r.boundary.length} pts</span>
                      : <span className="text-xs text-gray-400 flex-shrink-0">No boundary</span>
                    }
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={()=>{ setEditingId(r.id); setEditName(r.name); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title="Rename">
                      <Ic n="edit" cls="w-4 h-4"/>
                    </button>
                    <button onClick={()=>setDrawing(r)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition font-medium">
                      {hasBoundary ? '✏️ Edit' : '🗺 Draw'}
                    </button>
                    <button onClick={()=>handleDelete(r)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete region">
                      <Ic n="trash" cls="w-4 h-4"/>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
    </>
  );
}

// ─── SAMPLING REQUEST FORM ────────────────────────────────────────────────────
function SamplingRequestForm() {
  const { state, dispatch } = useApp();
  const me = state.users.find(u => u.id === state.user?.id);

  const blank = {
    location: '',
    repName: me?.name || '',
    date1: '', date2: '', date3: '',
    startHour: '6', startMin: '00', startAmPm: 'PM',
    endHour: '9', endMin: '00', endAmPm: 'PM',
    managerName: '', managerEmail: '', managerPhone: '',
  };
  const [form, setForm] = React.useState(blank);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const hours = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  const mins  = ['00','15','30','45'];

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startTime = `${form.startHour}:${form.startMin} ${form.startAmPm}`;
      const endTime   = `${form.endHour}:${form.endMin} ${form.endAmPm}`;
      const dates = [form.date1, form.date2, form.date3].filter(Boolean).join(' / ') || '—';
      emailjs.init(EMAILJS_PUBLIC_KEY);
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_SAMPLING_TEMPLATE_ID, {
        to_email:      ORDER_ADMIN_EMAIL,
        rep_name:      form.repName,
        location:      form.location,
        date_option_1: form.date1 || '—',
        date_option_2: form.date2 || '—',
        date_option_3: form.date3 || '—',
        proposed_dates: dates,
        start_time:    startTime,
        end_time:      endTime,
        manager_name:  form.managerName,
        manager_email: form.managerEmail || '—',
        manager_phone: form.managerPhone,
      });
      setSent(true);
      setForm(blank);
    } catch(err) {
      showToast(dispatch, 'Failed to send: ' + (err?.text || err?.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const selCls = "px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent";
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-400";

  function TimeSelect({ hourK, minK, ampmK }) {
    return (
      <div className="flex gap-2 items-center">
        <select value={form[hourK]} onChange={e=>set(hourK,e.target.value)} className={selCls}>
          {hours.map(h=><option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-400 text-sm">:</span>
        <select value={form[minK]} onChange={e=>set(minK,e.target.value)} className={selCls}>
          {mins.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={form[ampmK]} onChange={e=>set(ampmK,e.target.value)} className={selCls}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sampling Event Request</h2>
        <p className="text-sm text-gray-500 mt-1">Fill out this form with your event details to request a sampling session for Sueños Tequila.</p>
      </div>

      {sent && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
          <Ic n="check" cls="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Request sent!</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Your sampling request has been submitted to the team.</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Card cls="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Location <span className="text-red-400">*</span></label>
            <input className={inputCls} value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Store / venue name and address" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Rep Name <span className="text-red-400">*</span></label>
            <input className={inputCls} value={form.repName} onChange={e=>set('repName',e.target.value)} required />
          </div>
        </Card>

        <Card cls="p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Proposed Dates</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Option 1 <span className="text-red-400">*</span></label>
            <input type="date" className={inputCls} value={form.date1} onChange={e=>set('date1',e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Option 2</label>
            <input type="date" className={inputCls} value={form.date2} onChange={e=>set('date2',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Option 3</label>
            <input type="date" className={inputCls} value={form.date3} onChange={e=>set('date3',e.target.value)} />
          </div>
        </Card>

        <Card cls="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Start Time <span className="text-red-400">*</span></label>
            <TimeSelect hourK="startHour" minK="startMin" ampmK="startAmPm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">End Time <span className="text-red-400">*</span></label>
            <TimeSelect hourK="endHour" minK="endMin" ampmK="endAmPm" />
          </div>
        </Card>

        <Card cls="p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Manager / Contact</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Manager Name <span className="text-red-400">*</span></label>
            <input className={inputCls} value={form.managerName} onChange={e=>set('managerName',e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Manager Email</label>
            <input type="email" className={inputCls} value={form.managerEmail} onChange={e=>set('managerEmail',e.target.value)} placeholder="example@example.com" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Manager Phone <span className="text-red-400">*</span></label>
            <input type="tel" className={inputCls} value={form.managerPhone} onChange={e=>set('managerPhone',e.target.value)} required />
          </div>
        </Card>

        <Btn type="submit" cls="w-full" disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit Sampling Request'}
        </Btn>
      </form>
    </div>
  );
}

// ─── RETAIL PRICING MONITOR ───────────────────────────────────────────────────
const PROVINCES_ALL = ['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL'];
const PROVINCE_NAMES = {BC:'British Columbia',AB:'Alberta',SK:'Saskatchewan',MB:'Manitoba',ON:'Ontario',QC:'Québec',NB:'New Brunswick',NS:'Nova Scotia',PE:'PEI',NL:'Newfoundland'};
const CATEGORY_LABELS = {blanco:'Blanco',reposado:'Reposado',anejo:'Añejo',extra_anejo:'Extra Añejo',other:'Other'};
const CAT_COLORS = {blanco:'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',reposado:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',anejo:'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',extra_anejo:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',other:'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'};

function RetailPricingView() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState('data');        // data | settings | log
  const [fProv, setFProv] = useState('');
  const [fCat,  setFCat]  = useState('');
  const [fQ,    setFQ]    = useState('');
  const [sortBy, setSortBy] = useState('checked_at');
  const [sortDir, setSortDir] = useState('desc');
  const [csvBusy, setCsvBusy] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;
  const [localProvinces, setLocalProvinces] = useState(state.pricingSettings?.provinces || ['BC','ON']);
  const [loaded, setLoaded] = useState(false);

  // Load data on first visit
  useEffect(() => {
    if (!loaded) {
      setLoaded(true);
      dbLoadPricingData(dispatch);
      dbLoadPricingRuns(dispatch);
      dbLoadPricingSettings(dispatch);
    }
  }, [loaded]);

  // Sync local province selection when settings load
  useEffect(() => {
    setLocalProvinces(state.pricingSettings?.provinces || ['BC','ON']);
  }, [state.pricingSettings?.provinces?.join(',')]);

  // ── Filtered + sorted pricing data ─────────────────────────────
  const filtered = useMemo(() => {
    setPage(1);
    let rows = state.pricingData || [];
    if (fProv) rows = rows.filter(r => r.province === fProv);
    if (fCat)  rows = rows.filter(r => r.category === fCat);
    if (fQ)    rows = rows.filter(r => r.product_name?.toLowerCase().includes(fQ.toLowerCase()) || r.retailer?.toLowerCase().includes(fQ.toLowerCase()));
    return [...rows].sort((a, b) => {
      const va = a[sortBy] ?? '', vb = b[sortBy] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [state.pricingData, fProv, fCat, fQ, sortBy, sortDir]);

  // ── Province summary snapshot ───────────────────────────────────
  const snapshot = useMemo(() => {
    const byProv = {};
    for (const r of (state.pricingData || [])) {
      if (!byProv[r.province]) byProv[r.province] = { count:0, minPrice:Infinity, maxPrice:-Infinity, lastChecked:'' };
      byProv[r.province].count++;
      if (r.price_cad) { byProv[r.province].minPrice = Math.min(byProv[r.province].minPrice, r.price_cad); byProv[r.province].maxPrice = Math.max(byProv[r.province].maxPrice, r.price_cad); }
      if (r.checked_at > byProv[r.province].lastChecked) byProv[r.province].lastChecked = r.checked_at;
    }
    return byProv;
  }, [state.pricingData]);

  // ── Anomalies: price change ≥ 10% ──────────────────────────────
  const anomalies = useMemo(() =>
    (state.pricingData || []).filter(r => r.price_change_pct && Math.abs(r.price_change_pct) >= 10),
  [state.pricingData]);

  // ── Sueños brand spotlight ──────────────────────────────────
  const suenosData = useMemo(() => {
    const all = state.pricingData || [];
    // Match "Sueños" or "Suenos" as a whole word, AND confirm it's a tequila product
    const isSuenos = r => {
      const n = r.product_name?.toLowerCase() || '';
      const hasBrand = /\bsue[nñ]os\b/.test(n);
      const isTequila = n.includes('tequila') || ['blanco','reposado','anejo','extra_anejo'].includes(r.category);
      return hasBrand && isTequila;
    };
    const suenosRows = all.filter(isSuenos);
    const allRetailers = [...new Set(all.map(r => r.retailer))].sort();
    const suenosRetailerSet = new Set(suenosRows.map(r => r.retailer));
    const gapRetailers = allRetailers.filter(r => !suenosRetailerSet.has(r));

    // Group by category + volume — lowest price wins per retailer slot
    const skuMap = {};
    for (const r of suenosRows) {
      const key = `${r.category}-${r.volume_ml ?? 'unknown'}`;
      if (!skuMap[key]) skuMap[key] = { category: r.category, volume_ml: r.volume_ml, byRetailer: {}, minPrice: Infinity, maxPrice: -Infinity };
      const prev = skuMap[key].byRetailer[r.retailer];
      if (!prev || r.price_cad < prev.price) {
        skuMap[key].byRetailer[r.retailer] = { price: r.price_cad, url: r.product_url, in_stock: r.in_stock };
      }
      skuMap[key].minPrice = Math.min(skuMap[key].minPrice, r.price_cad);
      skuMap[key].maxPrice = Math.max(skuMap[key].maxPrice, r.price_cad);
    }
    const catOrder = ['blanco','reposado','anejo','extra_anejo','other'];
    const skus = Object.values(skuMap).sort((a, b) =>
      catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || (a.volume_ml ?? 0) - (b.volume_ml ?? 0)
    );
    return { suenosRows, allRetailers, gapRetailers, skus };
  }, [state.pricingData]);

  // ── Avg 750ml Blanco price for selected province ────────────────
  const blanco750avg = useMemo(() => {
    const rows = (state.pricingData || []).filter(r =>
      r.category === 'blanco' &&
      r.volume_ml === 750 &&
      r.price_cad > 0 &&
      (!fProv || r.province === fProv)
    );
    if (rows.length === 0) return null;
    const prices = rows.map(r => r.price_cad);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { avg, min, max, count: rows.length };
  }, [state.pricingData, fProv]);

  // ── New / disappeared products (compare two most recent run IDs) ─
  const productStatus = useMemo(() => {
    const data = state.pricingData || [];
    // Map run_id → most recent checked_at for ordering
    const runDateMap = {};
    for (const r of data) {
      if (r.run_id && r.checked_at) {
        if (!runDateMap[r.run_id] || r.checked_at > runDateMap[r.run_id]) runDateMap[r.run_id] = r.checked_at;
      }
    }
    const sortedRuns = Object.keys(runDateMap).sort((a, b) => runDateMap[b].localeCompare(runDateMap[a]));
    const latestRunId = sortedRuns[0];
    const prevRunId   = sortedRuns[1];
    if (!latestRunId || !prevRunId) return { newKeys: new Set(), goneRows: [] };

    const latestKeys = new Set();
    const prevKeys   = new Set();
    const prevRowMap = {};
    for (const r of data) {
      const key = `${r.retailer}||${r.product_name}`;
      if (r.run_id === latestRunId) latestKeys.add(key);
      if (r.run_id === prevRunId)   { prevKeys.add(key); if (!prevRowMap[key]) prevRowMap[key] = r; }
    }
    const newKeys  = new Set([...latestKeys].filter(k => !prevKeys.has(k)));
    const goneRows = [...prevKeys].filter(k => !latestKeys.has(k)).map(k => prevRowMap[k]);
    return { newKeys, goneRows };
  }, [state.pricingData]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  function SortHdr({ col, children }) {
    const active = sortBy === col;
    return (
      <th className="px-3 py-2 text-left cursor-pointer select-none hover:text-teal-600 dark:hover:text-teal-400 whitespace-nowrap"
          onClick={() => toggleSort(col)}>
        {children}{active ? (sortDir==='asc'?' ↑':' ↓') : ''}
      </th>
    );
  }

  async function handleFetchNow() {
    try {
      const result = await dbFetchPricingNow(dispatch, localProvinces);
      showToast(dispatch, `Fetched ${result?.records ?? 0} records`, result?.status === 'failed' ? 'error' : 'success');
      // Reload data + run log so the table updates immediately
      await dbLoadPricingData(dispatch);
      await dbLoadPricingRuns(dispatch);
    } catch(e) {
      showToast(dispatch, 'Fetch failed: ' + e.message, 'error');
    }
  }

  async function handleSaveSettings() {
    await dbSavePricingSettings(dispatch, { provinces: localProvinces, enabled: true });
    showToast(dispatch, 'Settings saved');
  }

  function exportCSV() {
    setCsvBusy(true);
    const cols = ['product_name','category','volume_ml','retailer','province','price_cad','prev_price_cad','price_change_pct','sku','in_stock','checked_at'];
    const rows = [cols.join(','), ...filtered.map(r => cols.map(c => {
      const v = r[c] ?? '';
      return String(v).includes(',') ? `"${v}"` : v;
    }).join(','))];
    const blob = new Blob([rows.join('\n')], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `suenos-retail-pricing-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    setCsvBusy(false);
  }

  const selCls = "px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300";
  const lastRun = (state.pricingRuns || [])[0];
  const fmtDT = s => s ? new Date(s).toLocaleString('en-CA', {dateStyle:'medium',timeStyle:'short'}) : '—';

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Retail Pricing Monitor</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Tequila retail prices across Canada · auto-runs every Monday 4 AM
            {lastRun && <span className="ml-2">· Last run: {fmtDT(lastRun.started_at)} <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${lastRun.status==='success'?'bg-emerald-100 text-emerald-700':lastRun.status==='partial'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>{lastRun.status}</span></span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportCSV} disabled={csvBusy || filtered.length===0}>
            <Ic n="download" cls="w-4 h-4"/> Export CSV
          </Btn>
          <Btn onClick={handleFetchNow} disabled={state.pricingFetching}>
            {state.pricingFetching
              ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"/> Fetching…</>
              : <><Ic n="refresh" cls="w-4 h-4"/> Fetch Pricing Now</>}
          </Btn>
        </div>
      </div>

      {/* Price anomaly banner */}
      {anomalies.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold">⚠️ {anomalies.length} price change{anomalies.length>1?'s':''} ≥ 10% detected</span>
          <span className="ml-2 opacity-70">— filter by product below to investigate</span>
        </div>
      )}

      {/* Province snapshot cards */}
      {Object.keys(snapshot).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
          {PROVINCES_ALL.filter(p => snapshot[p]).map(p => (
            <button key={p} onClick={() => setFProv(fProv===p?'':p)}
              className={`text-left p-3 rounded-xl border transition-all ${fProv===p?'border-teal-400 bg-teal-50 dark:bg-teal-900/20':'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-teal-300'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white">{p}</span>
                <span className="text-xs text-gray-400">{snapshot[p].count} products</span>
              </div>
              <div className="text-xs text-gray-500">
                ${snapshot[p].minPrice === Infinity ? '—' : snapshot[p].minPrice?.toFixed(2)}
                {' – '}${snapshot[p].maxPrice === -Infinity ? '—' : snapshot[p].maxPrice?.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{fmtDT(snapshot[p].lastChecked).split(',')[0]}</div>
            </button>
          ))}
        </div>
      )}

      {/* Avg 750ml Blanco highlight */}
      {blanco750avg && (
        <div className="mb-4 flex items-center gap-4 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-200 dark:border-teal-700">
          <div className="flex-1">
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400 uppercase tracking-wide">
              Avg. 750ml Blanco · {fProv || 'All Provinces'}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              ${blanco750avg.avg.toFixed(2)}
              <span className="text-xs font-normal text-gray-400 ml-2">CAD</span>
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            <div><span className="text-gray-400">Low</span> <span className="font-semibold text-gray-700 dark:text-gray-300">${blanco750avg.min.toFixed(2)}</span></div>
            <div><span className="text-gray-400">High</span> <span className="font-semibold text-gray-700 dark:text-gray-300">${blanco750avg.max.toFixed(2)}</span></div>
            <div className="text-gray-400">{blanco750avg.count} SKU{blanco750avg.count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[['data','Pricing Data'],['suenos','🌵 Sueños'],['settings','Settings'],['log','Run Log']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===v?'border-teal-500 text-teal-600 dark:text-teal-400':'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {l}{v==='log'&&state.pricingRuns?.length?' ('+state.pricingRuns.length+')':''}
          </button>
        ))}
      </div>

      {/* ── TAB: Pricing Data ───────────────────────────────────── */}
      {tab==='data' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[160px]">
              <Ic n="search" cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={fQ} onChange={e=>setFQ(e.target.value)} placeholder="Search product or retailer…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent"/>
            </div>
            <select value={fProv} onChange={e=>setFProv(e.target.value)} className={selCls}>
              <option value="">All Provinces</option>
              {PROVINCES_ALL.map(p=><option key={p} value={p}>{p} — {PROVINCE_NAMES[p]}</option>)}
            </select>
            <select value={fCat} onChange={e=>setFCat(e.target.value)} className={selCls}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            {(fQ||fProv||fCat) && <button onClick={()=>{setFQ('');setFProv('');setFCat('');}} className="text-xs text-teal-600 dark:text-teal-400 hover:underline px-2">Clear</button>}
            <span className="self-center text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length!==1?'s':''}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="reports" title="No pricing data yet"
              action={<Btn onClick={handleFetchNow} disabled={state.pricingFetching}>Fetch Pricing Now</Btn>}/>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <SortHdr col="product_name">Product</SortHdr>
                    <SortHdr col="category">Category</SortHdr>
                    <SortHdr col="volume_ml">Volume</SortHdr>
                    <SortHdr col="retailer">Retailer</SortHdr>
                    <SortHdr col="province">Province</SortHdr>
                    <SortHdr col="price_cad">Price</SortHdr>
                    <th className="px-3 py-2 text-left">Change</th>
                    <SortHdr col="checked_at">Checked</SortHdr>
                    <th className="px-3 py-2 text-left">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(r => {
                    const chg = r.price_change_pct;
                    const anomaly = chg && Math.abs(chg) >= 10;
                    const isNew = productStatus.newKeys.has(`${r.retailer}||${r.product_name}`);
                    return (
                      <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${anomaly?'bg-amber-50/50 dark:bg-amber-900/10':''} ${isNew?'bg-emerald-50/70 dark:bg-emerald-900/10':''}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {isNew && <span className="shrink-0 px-1 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 uppercase tracking-wide">New</span>}
                            {r.product_url
                              ? <a href={r.product_url} target="_blank" rel="noopener" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">{r.product_name}</a>
                              : <span className="font-medium text-gray-900 dark:text-white">{r.product_name}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CAT_COLORS[r.category]||CAT_COLORS.other}`}>
                            {CATEGORY_LABELS[r.category]||r.category||'—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{r.volume_ml ? r.volume_ml+'ml' : '—'}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.retailer}</td>
                        <td className="px-3 py-2"><span className="font-medium text-gray-900 dark:text-white">{r.province}</span></td>
                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{r.price_cad ? '$'+r.price_cad.toFixed(2) : '—'}</td>
                        <td className="px-3 py-2">
                          {chg != null
                            ? <span className={`font-medium ${chg>0?'text-red-500':'text-emerald-600'} ${anomaly?'font-bold':''}`}>
                                {anomaly?'⚠️ ':''}{chg>0?'+':''}{chg.toFixed(1)}%
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.checked_at ? new Date(r.checked_at).toLocaleDateString('en-CA') : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`w-2 h-2 rounded-full inline-block ${r.in_stock ? 'bg-emerald-400' : 'bg-red-400'}`}/>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Gone ghost rows — products in previous run but missing from latest */}
                  {page === 1 && productStatus.goneRows
                    .filter(r =>
                      (!fProv || r.province === fProv) &&
                      (!fCat  || r.category === fCat)  &&
                      (!fQ    || r.product_name?.toLowerCase().includes(fQ.toLowerCase()) || r.retailer?.toLowerCase().includes(fQ.toLowerCase()))
                    )
                    .map(r => (
                      <tr key={'gone-'+r.id} className="opacity-50 bg-red-50/50 dark:bg-red-900/10">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 px-1 rounded text-[9px] font-bold bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 uppercase tracking-wide">Gone</span>
                            {r.product_url
                              ? <a href={r.product_url} target="_blank" rel="noopener" className="text-gray-400 line-through hover:underline">{r.product_name}</a>
                              : <span className="text-gray-400 line-through">{r.product_name}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium opacity-60 ${CAT_COLORS[r.category]||CAT_COLORS.other}`}>
                            {CATEGORY_LABELS[r.category]||r.category||'—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-400">{r.volume_ml ? r.volume_ml+'ml' : '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{r.retailer}</td>
                        <td className="px-3 py-2 text-gray-400">{r.province}</td>
                        <td className="px-3 py-2 text-gray-400">{r.price_cad ? '$'+r.price_cad.toFixed(2) : '—'}</td>
                        <td className="px-3 py-2 text-gray-400">—</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.checked_at ? new Date(r.checked_at).toLocaleDateString('en-CA') : '—'}</td>
                        <td className="px-3 py-2"><span className="w-2 h-2 rounded-full inline-block bg-gray-300"/></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">
                    Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                      className="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">← Prev</button>
                    {Array.from({length:Math.ceil(filtered.length/PAGE_SIZE)},(_,i)=>i+1).map(n=>(
                      <button key={n} onClick={()=>setPage(n)}
                        className={`px-2.5 py-1 text-xs rounded border ${n===page?'bg-teal-500 text-white border-teal-500':'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{n}</button>
                    ))}
                    <button onClick={()=>setPage(p=>Math.min(Math.ceil(filtered.length/PAGE_SIZE),p+1))} disabled={page===Math.ceil(filtered.length/PAGE_SIZE)}
                      className="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Settings ───────────────────────────────────────── */}
      {tab==='settings' && (
        <Card cls="p-5 max-w-md">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Provinces to Monitor</h3>
          <p className="text-xs text-gray-500 mb-4">The scraper will fetch pricing data for each selected province every Monday at 4:00 AM.</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {PROVINCES_ALL.map(p => (
              <label key={p} className="flex items-center gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <input type="checkbox"
                  checked={localProvinces.includes(p)}
                  onChange={e => setLocalProvinces(prev => e.target.checked ? [...prev,p] : prev.filter(x=>x!==p))}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-400"/>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{p}</span>
                  <span className="ml-1 text-gray-400 text-xs">{PROVINCE_NAMES[p]}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Btn onClick={handleSaveSettings} cls="flex-1">Save Settings</Btn>
            <Btn variant="secondary" onClick={() => setLocalProvinces(PROVINCES_ALL)} cls="flex-1">Select All</Btn>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">About the scraper</p>
            <p>Pricing is pulled from provincial liquor board websites (BCL, LCBO, SAQ, etc.) using structured data where available. Results may vary by province — sites that require JavaScript rendering may return fewer results. Clicking a product name opens the retailer's page.</p>
          </div>
        </Card>
      )}

      {/* ── TAB: Sueños Brand Spotlight ─────────────────────────── */}
      {tab==='suenos' && (
        <div>
          {suenosData.suenosRows.length === 0 ? (
            <EmptyState icon="tag" title="No Sueños listings found yet"
              action={<Btn onClick={handleFetchNow} disabled={state.pricingFetching}>Fetch Pricing Now</Btn>}/>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 border border-teal-100 dark:border-teal-800">
                  <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{suenosData.suenosRows.length}</div>
                  <div className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">Total Listings</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{suenosData.allRetailers.length - suenosData.gapRetailers.length}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Retailers Carrying Sueños</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{suenosData.gapRetailers.length}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Distribution Gaps</div>
                </div>
              </div>

              {/* Coverage grid — SKU × Retailer */}
              {suenosData.skus.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Price Coverage by SKU</h3>
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left whitespace-nowrap">SKU</th>
                          {suenosData.allRetailers.map(r => (
                            <th key={r} className="px-3 py-2 text-center whitespace-nowrap">{r}</th>
                          ))}
                          <th className="px-3 py-2 text-center whitespace-nowrap">Price Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {suenosData.skus.map(sku => (
                          <tr key={`${sku.category}-${sku.volume_ml}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium mr-1.5 ${CAT_COLORS[sku.category]||CAT_COLORS.other}`}>
                                {CATEGORY_LABELS[sku.category]||sku.category}
                              </span>
                              <span className="text-gray-500">{sku.volume_ml ? sku.volume_ml+'ml' : 'Unknown size'}</span>
                            </td>
                            {suenosData.allRetailers.map(retailer => {
                              const entry = sku.byRetailer[retailer];
                              return (
                                <td key={retailer} className="px-3 py-2.5 text-center">
                                  {entry ? (
                                    <a href={entry.url} target="_blank" rel="noopener"
                                      className={`font-semibold hover:underline ${entry.in_stock ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                      ${entry.price.toFixed(2)}
                                      {!entry.in_stock && <span className="block text-gray-400 font-normal">(OOS)</span>}
                                    </a>
                                  ) : (
                                    <span className="text-gray-300 dark:text-gray-600 text-lg">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5 text-center text-gray-500 font-medium">
                              {sku.minPrice === sku.maxPrice
                                ? `$${sku.minPrice.toFixed(2)}`
                                : `$${sku.minPrice.toFixed(2)} – $${sku.maxPrice.toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 ml-1">Prices link directly to the product page. Green = in stock.</p>
                </div>
              )}

              {/* Distribution gap list */}
              {suenosData.gapRetailers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    ⚡ Distribution Gaps
                    <span className="ml-2 text-xs font-normal text-gray-400">Retailers we track that aren't carrying Sueños</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {suenosData.gapRetailers.map(r => (
                      <div key={r} className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/>
                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{r}</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 ml-auto">Not listed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {suenosData.gapRetailers.length === 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-sm text-emerald-700 dark:text-emerald-300 font-medium text-center">
                  🎉 Sueños is listed at every retailer we track!
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Run Log ────────────────────────────────────────── */}
      {tab==='log' && (
        <div>
          {(!state.pricingRuns || state.pricingRuns.length === 0) ? (
            <EmptyState icon="reports" title="No scrape runs yet" action={<Btn onClick={handleFetchNow}>Run First Fetch</Btn>}/>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Started</th>
                    <th className="px-3 py-2 text-left">Provinces</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Records</th>
                    <th className="px-3 py-2 text-left">Trigger</th>
                    <th className="px-3 py-2 text-left">Duration</th>
                    <th className="px-3 py-2 text-left">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {state.pricingRuns.map(run => {
                    const dur = run.completed_at && run.started_at
                      ? Math.round((new Date(run.completed_at)-new Date(run.started_at))/1000)
                      : null;
                    const errs = Array.isArray(run.errors) ? run.errors : [];
                    return (
                      <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmtDT(run.started_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(run.provinces||[]).map(p=><span key={p} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">{p}</span>)}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${run.status==='success'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':run.status==='partial'?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':run.status==='running'?'bg-blue-100 text-blue-600':'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {run.status==='running'?'⟳ running':run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{run.records_fetched ?? 0}</td>
                        <td className="px-3 py-2 text-gray-500 capitalize">{run.triggered_by||'schedule'}</td>
                        <td className="px-3 py-2 text-gray-500">{dur != null ? dur+'s' : '—'}</td>
                        <td className="px-3 py-2">
                          {errs.length > 0
                            ? <span className="text-red-500" title={errs.map(e=>e.province+': '+e.error).join('\n')}>⚠️ {errs.length} error{errs.length>1?'s':''}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CLUSTER AD PLANNER ───────────────────────────────────────────────────────
function ClusterAdsView() {
  const { state, dispatch } = useApp();
  const [minCount, setMinCount]   = useState(5);
  const [radiusKm, setRadiusKm]   = useState(25);
  const [statusFilter, setStatusFilter] = useState('listed');
  const [expandedId,  setExpandedId]  = useState(null);
  const [mode,        setMode]        = useState('clusters'); // 'clusters' | 'single'
  const [singleAcctId, setSingleAcctId] = useState(null);
  const [acctSearch,  setAcctSearch]  = useState('');
  const [metaModal,   setMetaModal]   = useState(null); // cluster being pushed
  const [metaForm,    setMetaForm]    = useState({});
  const [metaStatus,  setMetaStatus]  = useState({ loading: false, result: null, error: null });
  const [editPlans,   setEditPlans]   = useState({}); // per-cluster editable plan overrides
  const [showCreativeLib, setShowCreativeLib] = useState(false); // image library picker in Meta modal
  const [libGroupFilter, setLibGroupFilter] = useState('all');   // campaign filter for library pickers
  const [radioGenerating, setRadioGenerating] = useState({});    // { [clusterId]: bool }
  const [spotifyStatus, setSpotifyStatus] = useState({});        // { [clusterId]: { loading, result, error } }
  const libGroups = [...new Set((state.adCreatives||[]).map(c=>c.group).filter(Boolean))].sort();
  const libFiltered = (state.adCreatives||[]).filter(c =>
    libGroupFilter==='all' || (libGroupFilter==='ungrouped' ? !c.group : c.group===libGroupFilter));
  const [showVoiceTone, setShowVoiceTone] = useState(false); // voice & tone reference panel in Meta modal
  const [copyGenerating, setCopyGenerating] = useState(false); // AI copy generation loading state (Push to Meta modal)
  const [planGenerating, setPlanGenerating] = useState({}); // AI copy generation per cluster card (keyed by cluster.id)
  const [formatPicker,   setFormatPicker]   = useState(null);  // { clusterId, formatKey } — which format card picker is open
  const [formatUploading,setFormatUploading]= useState(false);
  const formatFileRef = useRef(null);

  // Haversine distance in km
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371, toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Accounts eligible for clustering
  const eligible = useMemo(() => {
    const withCoords = state.accounts.filter(a => a.lat && a.lng);
    if (statusFilter === 'listed') return withCoords.filter(a => a.status === 'Listed' || a.status === 'Active');
    return withCoords;
  }, [state.accounts, statusFilter]);

  // Greedy geographic clustering
  const clusters = useMemo(() => {
    if (eligible.length < minCount) return [];

    // Pre-compute neighbors for each account within radius
    const neighborhoods = eligible.map(a => ({
      account: a,
      nearby: eligible.filter(b => b.id !== a.id && haversine(a.lat, a.lng, b.lat, b.lng) <= radiusKm),
    }));

    const assigned = new Set();
    const result   = [];

    // Process largest neighborhoods first (greedy)
    const sorted = [...neighborhoods].sort((a, b) => b.nearby.length - a.nearby.length);

    for (const { account, nearby } of sorted) {
      if (assigned.has(account.id)) continue;
      const members = [account, ...nearby.filter(b => !assigned.has(b.id))];
      if (members.length < minCount) continue;

      // Centroid
      const avgLat = members.reduce((s, a) => s + a.lat, 0) / members.length;
      const avgLng = members.reduce((s, a) => s + a.lng, 0) / members.length;

      // Dominant city
      const cityFreq = {};
      members.forEach(a => {
        const c = (a.address||'').split(',').slice(-3,-2)[0]?.trim() || '';
        if (c) cityFreq[c] = (cityFreq[c]||0) + 1;
      });
      const city = Object.entries(cityFreq).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'This Area';

      // Account type breakdown
      const typeCounts = {};
      members.forEach(a => {
        const t = a.accountType || a.type || 'Other';
        typeCounts[t] = (typeCounts[t]||0) + 1;
      });
      const dominantType = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Other';

      members.forEach(a => assigned.add(a.id));
      result.push({ id: 'cl-' + result.length, members, city, avgLat, avgLng, typeCounts, dominantType });
    }

    return result.sort((a, b) => b.members.length - a.members.length);
  }, [eligible, minCount, radiusKm]);

  // Open Push to Meta modal
  function openMetaModal(cluster) {
    const plan   = genPlan(cluster);
    const ep     = editPlans[cluster.id] || {};
    const ctaMap = { 'Shop Now':'SHOP_NOW', 'Learn More':'LEARN_MORE', 'Find Us':'LEARN_MORE', 'Get Directions':'GET_DIRECTIONS' };
    const copy   = (ep.copy || plan.copy).replace(/^"|"$/g,'');
    const cta    = ep.cta  || plan.cta;
    const budgetNum = parseFloat((ep.budget || '30').replace(/[^0-9.]/g,'')) || 30;
    // Pick image: prefer format cards (feed_square > feed_portrait > stories_reels > right_column > any), fall back to imageNotes URL
    const fmtImgs = ep.formatImages || {};
    const imageUrl = fmtImgs.feed_square || fmtImgs.feed_portrait || fmtImgs.stories_reels || fmtImgs.right_column
      || Object.values(fmtImgs).find(Boolean) || '';
    setMetaForm({
      metaToken:       localStorage.getItem('meta_access_token') || '',
      pageId:          localStorage.getItem('meta_page_id')      || '',
      websiteUrl:      localStorage.getItem('meta_website_url')  || 'https://suenostequila.com',
      budget:          budgetNum,
      copy,
      headline:        ep.angle ? ep.angle : `Sueños Tequila — ${cluster.city}`,
      description:     'Premium agave tequila. Now available near you.',
      ctaType:         ctaMap[cta] || 'LEARN_MORE',
      imageUrl,
      startDate:       ep.startDate || '',
      endDate:         ep.endDate   || '',
      timing:          ep.timing    || plan.timing || '',
      objective:       'OUTCOME_TRAFFIC',
      optimizationGoal:'LINK_CLICKS',
      billingEvent:    'IMPRESSIONS',
      bidStrategy:     'LOWEST_COST_WITHOUT_CAP',
      ageMin:          ep.ageMin || '25',
      ageMax:          ep.ageMax || '54',
      gender:          ep.gender || 'all',   // 'all' | 'male' | 'female'
      budgetType:      ep.budgetType || 'daily',              // 'daily' | 'lifetime'
      schedMode:       ep.schedMode  || 'all',                // 'all' (24h) | 'hours'
      schedStartHour:  ep.schedStartHour || '17',             // 0–23
      schedEndHour:    ep.schedEndHour   || '24',             // 1–24
      schedDays:       (ep.schedDays && ep.schedDays.length) ? ep.schedDays : [0,1,2,3,4,5,6],
      locationTypes:   ep.locationTypes || 'home,recent',
      launchActive:    false,                // push ACTIVE (live) vs PAUSED
    });
    setMetaStatus({ loading: false, result: null, error: null });
    setMetaModal(cluster);
  }

  // ── Spotify radio ads ────────────────────────────────────────────────────
  async function generateRadioScript(cluster) {
    if (!localStorage.getItem('anthropic_api_key')) {
      showToast(dispatch, 'Add your Anthropic API key in Settings → API Credentials first', 'error');
      return;
    }
    setRadioGenerating(s=>({...s,[cluster.id]:true}));
    try {
      const ep = editPlans[cluster.id] || {};
      const data = await generateRadioScriptWithAI({
        city: cluster.city, dominantType: cluster.dominantType || '',
        voiceTone: state.voiceTone || '', voiceProfile: state.voiceProfile,
        instructions: ep.aiInstructions || '',
      });
      setEditPlans(x=>({...x,[cluster.id]:{...x[cluster.id],
        ...(data.script  ? { radioScript:  data.script  } : {}),
        ...(data.tagline ? { radioTagline: data.tagline } : {}),
      }}));
      showToast(dispatch, '🎙 Radio script written — read it aloud to check the timing');
    } catch(e) { showToast(dispatch, String(e.message||e), 'error'); }
    finally { setRadioGenerating(s=>({...s,[cluster.id]:false})); }
  }

  async function uploadRadioAudio(cluster, e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const path = `radio_${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const { error } = await sb.storage.from('ad-images').upload(path, f, { contentType: f.type });
      if (error) throw new Error(error.message);
      const { data } = sb.storage.from('ad-images').getPublicUrl(path);
      setEditPlans(x=>({...x,[cluster.id]:{...x[cluster.id], radioAudioUrl:data.publicUrl, radioAudioName:f.name}}));
      showToast(dispatch, '🎧 Audio uploaded');
    } catch(err) {
      showToast(dispatch, 'Audio upload failed: ' + String(err.message||err), 'error');
    } finally { e.target.value=''; }
  }

  async function pushToSpotify(cluster) {
    const ep = editPlans[cluster.id] || {};
    setSpotifyStatus(s=>({...s,[cluster.id]:{loading:true}}));
    try {
      // Resolve ad account (cached after first lookup, synced to all devices)
      let adAccountId = localStorage.getItem('spotify_ad_account_id') || '';
      if (!adAccountId) {
        const { data: st, error: stErr } = await sb.functions.invoke('spotify-ads', { body:{ action:'status' } });
        if (stErr || st?.error) throw new Error((st?.error || stErr.message) + ' — you can also paste your Spotify Ad Account ID in Settings → API Credentials.');
        const accts = Array.isArray(st.adAccounts) ? st.adAccounts : (st.adAccounts?.data || st.adAccounts?.ad_accounts || []);
        if (!accts.length) throw new Error('No Spotify ad accounts found — paste your Spotify Ad Account ID in Settings → API Credentials.');
        adAccountId = accts[0].id;
        dbSaveApiCred('spotify_ad_account_id', adAccountId);
      }
      const budgetNum = parseFloat(String(ep.budget||'25').replace(/[^0-9.]/g,'')) || 25;
      const { data: res, error: fnErr } = await sb.functions.invoke('spotify-ads', { body:{
        action: 'create_radio',
        adAccountId,
        name: `Suenos Radio - ${cluster.city} - ${new Date().toISOString().slice(0,10)}`,
        dailyBudget: budgetNum,
        startDate: ep.startDate || new Date(Date.now()+86400000).toISOString(),
        endDate: ep.endDate || null,
        ageMin: ep.ageMin || '19', ageMax: ep.ageMax || '54', gender: ep.gender || 'all',
        audioUrl: ep.radioAudioUrl || null,
        logoUrl: state.brandLogoUrl || null,
        tagline: ep.radioTagline || 'Premium agave tequila',
        clickthroughUrl: localStorage.getItem('meta_website_url') || 'https://suenos.ca',
      }});
      if (fnErr || res?.error) throw new Error(res?.error || fnErr.message);
      setSpotifyStatus(s=>({...s,[cluster.id]:{loading:false, result:res}}));
      // Persist so Ad Performance can track it
      try {
        await dbSaveMetaCampaign(dispatch, {
          id: genId(), campaignId: res.campaignId, adsetId: res.adSetId, adId: res.adId || null,
          city: cluster.city, clusterId: cluster.id, createdBy: state.user?.id, platform: 'spotify',
        });
      } catch(se) { console.warn('[SpotifyCampaign save]', se); }
      showToast(dispatch, '🎧 Spotify campaign created — delivery is OFF until you enable it in Ads Manager');
    } catch(e) {
      setSpotifyStatus(s=>({...s,[cluster.id]:{loading:false, error:String(e.message||e)}}));
    }
  }

  // Parse plan timing strings like "Thu–Sat 5 pm–midnight", "Daily 4–9 pm", "Fri–Sun all day"
  // into Meta adset_schedule entries. Returns null if unparseable.
  function parseTiming(str) {
    if (!str) return null;
    const s = String(str).trim().toLowerCase().replace(/—/g,'–').replace(/-/g,'–');
    const DAYS = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
    const dayMatch = s.match(/^(daily|everyday|(sun|mon|tue|wed|thu|fri|sat)[a-z]*(\s*–\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*)?)/);
    if (!dayMatch) return null;
    let days;
    if (dayMatch[1] === 'daily' || dayMatch[1] === 'everyday') days = [0,1,2,3,4,5,6];
    else {
      const d1 = DAYS[dayMatch[2]], d2 = dayMatch[4] ? DAYS[dayMatch[4]] : DAYS[dayMatch[2]];
      days = []; let d = d1;
      while (true) { days.push(d); if (d === d2) break; d = (d+1)%7; if (days.length > 7) return null; }
    }
    const rest = s.slice(dayMatch[0].length).trim();
    let startMin, endMin;
    if (!rest || rest === 'all day') { startMin = 0; endMin = 1440; }
    else {
      const t = rest.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*–\s*(midnight|noon|(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)$/);
      if (!t) return null;
      const toMin = (h, m, mer) => {
        h = parseInt(h); m = m ? parseInt(m) : 0;
        if (mer === 'pm' && h !== 12) h += 12;
        if (mer === 'am' && h === 12) h = 0;
        return h*60 + m;
      };
      if (t[4] === 'midnight') endMin = 1440;
      else if (t[4] === 'noon') endMin = 720;
      else endMin = toMin(t[5], t[6], t[7]);
      startMin = toMin(t[1], t[2], t[3] || t[7] || (t[4] === 'midnight' ? 'pm' : undefined));
      if (endMin === startMin) return null;
    }
    if (endMin > startMin) return [{ start_minute: startMin, end_minute: endMin, days }];
    // Window crosses midnight (e.g. 9 pm–2 am) — split into two entries
    return [
      { start_minute: startMin, end_minute: 1440, days },
      { start_minute: 0, end_minute: endMin, days: days.map(d => (d+1)%7) },
    ];
  }

  // Call Meta Marketing API directly from the browser
  async function pushToMeta() {
    if (!metaForm.metaToken || !metaForm.pageId || !metaForm.websiteUrl || (!metaForm.copy && !metaForm.headline)) return;
    setMetaStatus({ loading: true, result: null, error: null });
    dbSaveApiCred('meta_access_token', metaForm.metaToken);
    dbSaveApiCred('meta_page_id',      metaForm.pageId);
    dbSaveApiCred('meta_website_url',  metaForm.websiteUrl);

    const BASE    = 'https://graph.facebook.com/v25.0';
    const ACT     = 'act_813974741538881';
    const TOKEN   = metaForm.metaToken;
    const dateStr = new Date().toISOString().slice(0,10);
    const pushStatus = metaForm.launchActive ? 'ACTIVE' : 'PAUSED';   // launch live vs paused

    async function metaPost(path, body) {
      const form = new URLSearchParams({ ...body, access_token: TOKEN });
      const res  = await fetch(`${BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const data = await res.json();
      if (data.error) {
        const detail = data.error.error_user_msg || data.error.error_user_title || data.error.message;
        throw new Error(`[${path}] ${detail} (code ${data.error.code}, sub ${data.error.error_subcode ?? '-'})`);
      }
      return data;
    }

    try {
      const clusterName = `${metaModal.city} - ${metaModal.members.length} Accounts`;

      // 1. Campaign
      const campaign = await metaPost(`${ACT}/campaigns`, {
        name: `Suenos - ${clusterName} - ${dateStr}`,
        objective: metaForm.objective,
        status: pushStatus,
        special_ad_categories: '[]',
        is_adset_budget_sharing_enabled: 'false',
      });

      // 2. Ad Set — with scheduling + demographics
      // Resolve targeting coordinates; geocode the account address if GPS is missing.
      let adLat = metaModal.centroid?.lat ?? metaModal.avgLat;
      let adLng = metaModal.centroid?.lng ?? metaModal.avgLng;
      if (!adLat || !adLng) {
        const addr = metaModal.members?.[0]?.address;
        if (addr) {
          try {
            const gr = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`, { headers:{'Accept-Language':'en'} });
            const gd = await gr.json();
            if (gd && gd[0]) { adLat = parseFloat(gd[0].lat); adLng = parseFloat(gd[0].lon); }
          } catch(e) { /* geocode failed — handled below */ }
        }
      }
      if (!adLat || !adLng) {
        setMetaStatus({ loading:false, result:null, error:'This account has no map location yet. Open it under Accounts, add the address and tap Geocode (or enter GPS coordinates), then push again.' });
        return;
      }
      const targeting = {
        geo_locations: {
          custom_locations: [{
            latitude:      adLat,
            longitude:     adLng,
            radius:        radiusKm,
            distance_unit: 'kilometer',
          }],
          location_types: (metaForm.locationTypes || 'home,recent').split(','),
        },
        age_min: Number(metaForm.ageMin),
        age_max: Number(metaForm.ageMax),
        targeting_automation: { advantage_audience: 0 },
      };
      if (metaForm.gender === 'male')   targeting.genders = [1];
      if (metaForm.gender === 'female') targeting.genders = [2];

      const adsetBody = {
        name: `${metaModal.city} - Ages ${metaForm.ageMin}-${metaForm.ageMax}${metaForm.gender && metaForm.gender !== 'all' ? ` - ${metaForm.gender}` : ''}`,
        campaign_id: campaign.id,
        billing_event: metaForm.billingEvent,
        optimization_goal: metaForm.optimizationGoal,
        bid_strategy: metaForm.bidStrategy,
        status: pushStatus,
        targeting: JSON.stringify(targeting),
      };
      if (metaForm.startDate) adsetBody.start_time = new Date(metaForm.startDate).toISOString();
      if (metaForm.endDate)   adsetBody.end_time   = new Date(metaForm.endDate).toISOString();

      // Build the ad schedule (dayparting) from the structured hour picker.
      let schedule = null;
      if (metaForm.schedMode === 'hours') {
        const sMin = Number(metaForm.schedStartHour) * 60;
        const eMin = Number(metaForm.schedEndHour) * 60;   // 24 → 1440
        const days = (metaForm.schedDays && metaForm.schedDays.length) ? metaForm.schedDays.map(Number) : [0,1,2,3,4,5,6];
        if (eMin > sMin) schedule = [{ start_minute: sMin, end_minute: eMin, days }];
        else schedule = [   // window crosses midnight → split
          { start_minute: sMin, end_minute: 1440, days },
          { start_minute: 0,    end_minute: eMin, days: days.map(d => (d+1)%7) },
        ];
      }

      // Meta only allows an hourly schedule with a LIFETIME budget + an end date.
      let scheduleNote = '';
      const budgetCents = Math.round(Number(metaForm.budget) * 100);
      if (schedule && !(metaForm.startDate && metaForm.endDate)) {
        schedule = null;
        scheduleNote = ' Note: specific hours need both a start and end date — running all hours instead.';
      }
      if (metaForm.budgetType === 'lifetime' && metaForm.endDate) {
        adsetBody.lifetime_budget = String(budgetCents);
      } else if (schedule && metaForm.endDate) {
        // Daily budget chosen but an hourly schedule is set → convert to lifetime over the flight.
        const nDays = Math.max(1, Math.ceil((new Date(metaForm.endDate) - new Date(metaForm.startDate)) / 86400000));
        adsetBody.lifetime_budget = String(budgetCents * nDays);
        scheduleNote += ` Budget set to lifetime ($${Math.round(Number(metaForm.budget) * nDays)} over ${nDays} days) so the hourly schedule can apply.`;
      } else {
        if (metaForm.budgetType === 'lifetime') scheduleNote += ' Note: a Lifetime budget needs an end date — used a daily budget instead.';
        adsetBody.daily_budget = String(budgetCents);
      }
      if (schedule && adsetBody.lifetime_budget) {
        adsetBody.adset_schedule = JSON.stringify(schedule);
        adsetBody.pacing_type    = JSON.stringify(['day_parting']);
      }

      const adSet = await metaPost(`${ACT}/adsets`, adsetBody);

      // 3. Ad Creative
      const linkData = {
        message: metaForm.copy,
        link: metaForm.websiteUrl,
        name: metaForm.headline || `Suenos Tequila - ${metaModal.city}`,
        description: metaForm.description || 'Premium agave tequila. Now available near you.',
        call_to_action: JSON.stringify({ type: metaForm.ctaType, value: { link: metaForm.websiteUrl } }),
      };
      if (metaForm.imageUrl) linkData.picture = metaForm.imageUrl;

      const creative = await metaPost(`${ACT}/adcreatives`, {
        name: `Suenos ${metaModal.city} Creative - ${dateStr}`,
        object_story_spec: JSON.stringify({ page_id: metaForm.pageId, link_data: linkData }),
      });

      // 4. Ad
      const ad = await metaPost(`${ACT}/ads`, {
        name: `Suenos - ${metaModal.city} - ${radiusKm}km`,
        adset_id: adSet.id,
        creative: JSON.stringify({ creative_id: creative.id }),
        status: pushStatus,
      });

      const campaignUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=813974741538881`;
      const stateMsg = metaForm.launchActive
        ? 'Campaign, ad set & ad pushed LIVE (ACTIVE) — they will begin delivering and spending. Manage in Ads Manager.'
        : 'Campaign created in PAUSED state. Review in Ads Manager before activating.';
      setMetaStatus({ loading: false, result: { campaignId: campaign.id, adSetId: adSet.id, adId: ad.id, campaignUrl, message: `${stateMsg}${scheduleNote}` }, error: null });
      // Persist campaign to DB so performance can be tracked
      try {
        await dbSaveMetaCampaign(dispatch, {
          id: genId(), campaignId: campaign.id, adsetId: adSet.id, adId: ad.id,
          city: metaModal.city, clusterId: metaModal.id, createdBy: state.user?.id,
        });
      } catch(se) { console.warn('[MetaCampaign save]', se); }
    } catch (e) {
      setMetaStatus({ loading: false, result: null, error: String(e) });
    }
  }

  // Set a format image URL in a cluster's editPlan
  function setFormatImage(clusterId, formatKey, url) {
    setEditPlans(x=>({...x,[clusterId]:{...x[clusterId],formatImages:{...(x[clusterId]?.formatImages||{}),[formatKey]:url}}}));
    setFormatPicker(null);
  }

  // Upload a file for a specific format, save to ad_creatives library, and assign to cluster plan
  async function uploadFormatFile(e) {
    const file = e.target.files?.[0];
    if (!file || !formatPicker) return;
    setFormatUploading(true);
    try {
      const { clusterId, formatKey } = formatPicker;
      const created = await dbSaveCreative(dispatch, {
        name:   `${formatKey.replace(/_/g,' ')} — ${new Date().toLocaleDateString()}`,
        format: formatKey,
        notes:  '',
        file,
      });
      if (created?.publicUrl) setFormatImage(clusterId, formatKey, created.publicUrl);
      showToast(dispatch, 'Image uploaded and assigned ✓');
    } catch(err) {
      showToast(dispatch, String(err), 'error');
    } finally {
      setFormatUploading(false);
      if (formatFileRef.current) formatFileRef.current.value = '';
    }
  }

  // Generate AI copy directly in the cluster plan card (fills Angle + Copy fields)
  async function generatePlanCopy(cluster) {
    if (!localStorage.getItem('anthropic_api_key')) {
      showToast(dispatch, 'Add your Anthropic API key in Settings → AI Copy first', 'error');
      return;
    }
    setPlanGenerating(s=>({...s,[cluster.id]:true}));
    try {
      const ep   = editPlans[cluster.id] || {};
      const data = await generateAdCopyWithAI({
        city:         cluster.city,
        dominantType: cluster.dominantType || '',
        region:       cluster.members?.[0]?.region || '',
        voiceTone:    state.voiceTone || '',
        voiceProfile: state.voiceProfile,
        existingCopy: ep.copy || '',
        instructions: ep.aiInstructions || '',
      });
      setEditPlans(x=>({...x,[cluster.id]:{...x[cluster.id],
        ...(data.headline ? { angle: data.headline } : {}),
        ...(data.copy     ? { copy:  data.copy     } : {}),
      }}));
      showToast(dispatch, '✨ AI copy generated — edit as needed');
    } catch(e) {
      showToast(dispatch, String(e), 'error');
    } finally {
      setPlanGenerating(s=>({...s,[cluster.id]:false}));
    }
  }

  // Call AI to generate ad headline, copy, and description using voice & tone (Push to Meta modal)
  async function generateAdCopy() {
    if (!metaModal) return;
    if (!localStorage.getItem('anthropic_api_key')) {
      showToast(dispatch, 'Add your Anthropic API key in Settings → AI Copy first', 'error');
      return;
    }
    setCopyGenerating(true);
    try {
      const data = await generateAdCopyWithAI({
        city:         metaModal.city,
        dominantType: metaModal.dominantType || '',
        region:       metaModal.members?.[0]?.region || '',
        voiceTone:    state.voiceTone || '',
        voiceProfile: state.voiceProfile,
        existingCopy: metaForm.copy || '',
        instructions: metaForm.aiInstructions || '',
      });
      setMetaForm(f=>({
        ...f,
        ...(data.headline    ? { headline:    data.headline    } : {}),
        ...(data.copy        ? { copy:        data.copy        } : {}),
        ...(data.description ? { description: data.description } : {}),
      }));
      showToast(dispatch, '✨ AI copy generated — edit as needed');
    } catch(e) {
      showToast(dispatch, String(e), 'error');
    } finally {
      setCopyGenerating(false);
    }
  }

  // Generate a tailored Meta ad plan per cluster
  function genPlan(cluster) {
    const { city, dominantType, members } = cluster;
    const plans = {
      'Bar':          { angle:'cocktail culture & late-night energy',   copy:`The bartenders of ${city} are pouring Sueños. Find your pour. 🌵`,         budget:'$25–40/day', timing:'Thu–Sat 5 pm–midnight',  format:'Reels + Stories' },
      'Restaurant':   { angle:'premium dining & spirit pairing',        copy:`Elevate your dinner in ${city}. Sueños Tequila is on the menu. 🍽️`,         budget:'$20–35/day', timing:'Daily 4–9 pm',            format:'Single Image + Carousel' },
      'Liquor Store': { angle:'retail availability & weekend discovery', copy:`Sueños is now on shelves across ${city}. Pick up a bottle. 🛒`,             budget:'$15–25/day', timing:'Fri–Sun all day',          format:'Single Image + Stories' },
      'Hotel':        { angle:'premium hospitality & travel',           copy:`Your ${city} stay just got better. Sueños Tequila is in the bar. 🏨`,        budget:'$30–50/day', timing:'Daily 5–11 pm',           format:'Stories + Reels' },
      'Night Club':   { angle:'nightlife & bottle service',             copy:`The club scene in ${city} runs on Sueños. VIP pours all night. 🎶`,          budget:'$30–45/day', timing:'Fri–Sat 9 pm–2 am',       format:'Reels + Stories' },
    };
    const p = plans[dominantType] || { angle:'local spirits discovery', copy:`Discover Sueños Tequila across ${city}. Premium agave, now local. 🌵`,      budget:'$20–35/day', timing:'Daily 5 pm–midnight',     format:'Reels + Stories' };
    const audience = `${city} +${radiusKm} km · Ages 25–54 · Interests: tequila, cocktails, dining, spirits`;
    const cta = dominantType==='Liquor Store' ? 'Shop Now' : dominantType==='Restaurant'||dominantType==='Hotel' ? 'Learn More' : 'Find Us';
    return { ...p, audience, cta };
  }

  const noCoords = state.accounts.filter(a => !a.lat || !a.lng).length;

  // Single-account mode: wrap selected account as a pseudo-cluster
  const singleAcct   = state.accounts.find(a => a.id === singleAcctId) || null;
  const singleCluster = singleAcct ? {
    id:           `single_${singleAcct.id}`,
    city:         singleAcct.name,
    dominantType: singleAcct.type || 'Other',
    members:      [singleAcct],
    typeCounts:   { [singleAcct.type || 'Other']: 1 },
    centroid:     { lat: singleAcct.lat || 0, lng: singleAcct.lng || 0 },
  } : null;
  const renderClusters = mode === 'clusters' ? clusters : (singleCluster ? [singleCluster] : []);

  // Accounts to show in the single-account picker (all accounts, searchable)
  const acctList = useMemo(() => {
    const q = acctSearch.trim().toLowerCase();
    return state.accounts
      .filter(a => !q || a.name.toLowerCase().includes(q) || (a.region||'').toLowerCase().includes(q) || (a.type||'').toLowerCase().includes(q))
      .slice(0, 50);
  }, [state.accounts, acctSearch]);

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-5xl mx-auto">
      {/* Hidden file input for format image uploads */}
      <input ref={formatFileRef} type="file" accept="image/*" className="hidden" onChange={uploadFormatFile}/>
      {/* Header hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 mb-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10">
            <Ic n="ad" cls="w-6 h-6 text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight">Digital Ad Planner</h1>
            <p className="text-xs text-teal-100/70">
              {mode==='clusters'
                ? `${eligible.length} eligible accounts · ${clusters.length} cluster${clusters.length!==1?'s':''} found`
                : singleAcct ? `Targeting: ${singleAcct.name}` : 'Select an account to target'}
            </p>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-2 mt-4">
          {[{k:'clusters',l:'🗺 Clusters'},{k:'single',l:'🎯 Single Account'}].map(m=>(
            <button key={m.k} onClick={()=>{ setMode(m.k); setExpandedId(null); }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${mode===m.k?'bg-white text-[#2E8A97]':'bg-white/10 text-white/80 hover:bg-white/20'}`}>
              {m.l}
            </button>
          ))}
        </div>
      </div>

      {/* Single Account Picker */}
      {mode==='single' && (
        <Card cls="p-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Account</p>
          <input
            type="text" value={acctSearch} onChange={e=>setAcctSearch(e.target.value)}
            placeholder="Search by name, region, or type…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"/>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {acctList.map(a=>(
              <button key={a.id} onClick={()=>{ setSingleAcctId(a.id); setExpandedId(`single_${a.id}`); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between gap-2 ${singleAcctId===a.id?'bg-teal-50 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300':'border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                <span className="font-medium truncate">{a.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{a.type} · {a.region}</span>
              </button>
            ))}
            {acctList.length===0 && <p className="text-xs text-gray-400 text-center py-4">No accounts match "{acctSearch}"</p>}
          </div>
        </Card>
      )}

      {/* Controls — cluster mode only */}
      {mode==='clusters' && <Card cls="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Min Accounts in Cluster</label>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{minCount}</span>
            </div>
            <input type="range" min={3} max={10} value={minCount} onChange={e=>setMinCount(+e.target.value)} className="w-full accent-teal-600 h-1.5"/>
            <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>3</span><span>10</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Search Radius</label>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{radiusKm} km</span>
            </div>
            <input type="range" min={5} max={75} step={5} value={radiusKm} onChange={e=>setRadiusKm(+e.target.value)} className="w-full accent-teal-600 h-1.5"/>
            <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>5 km</span><span>75 km</span></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">Account Status</label>
            <div className="flex gap-2">
              {[{k:'listed',l:'Listed / Active'},{k:'all',l:'All Accounts'}].map(f=>(
                <button key={f.k} onClick={()=>setStatusFilter(f.k)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition font-medium ${statusFilter===f.k?'bg-teal-600 border-teal-600 text-white':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>}

      {/* No-coordinates warning — cluster mode only */}
      {mode==='clusters' && noCoords > 0 && (
        <div className="flex items-start gap-2.5 p-3 mb-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <Ic n="alert" cls="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">{noCoords} account{noCoords!==1?'s':''}</span> have no coordinates and won't appear in clusters. Open each account and re-save to geocode the address.
          </p>
        </div>
      )}

      {/* Empty states */}
      {mode==='clusters' && eligible.length === 0 && (
        <EmptyState icon="map" title="No accounts with coordinates" desc="Accounts need lat/lng to cluster. Re-save each account to geocode."/>
      )}
      {mode==='clusters' && eligible.length > 0 && clusters.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">No clusters found</p>
          <p className="text-sm text-gray-500">Try reducing min accounts to {Math.max(2,minCount-1)} or increasing radius to {radiusKm+10} km.</p>
        </div>
      )}

      {/* Single-mode: prompt to select */}
      {mode==='single' && !singleAcct && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm">Search and select an account above to start planning their ad.</p>
        </div>
      )}

      {/* Cluster cards / Single account card */}
      <div className="space-y-3">
        {renderClusters.map((cluster, ci) => {
          const plan    = genPlan(cluster);
          const isOpen  = expandedId === cluster.id;
          const metaUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CA&q=${encodeURIComponent('tequila spirits '+cluster.city)}`;
          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent('tequila spirits ads '+cluster.city+' BC promotions')}`;
          return (
            <Card key={cluster.id} cls="overflow-hidden">
              {/* Cluster header — click to expand */}
              <button className="w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
                onClick={()=>{
                  setExpandedId(isOpen ? null : cluster.id);
                  if (!editPlans[cluster.id]) {
                    const p = genPlan(cluster);
                    setEditPlans(ep=>({...ep,[cluster.id]:{angle:p.angle,copy:p.copy,cta:p.cta,budget:p.budget,timing:p.timing,format:p.format,audience:p.audience,imageNotes:'',startDate:'',endDate:'',formatImages:{},aiInstructions:''}}));
                  }
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                  style={{background:'linear-gradient(135deg,#0d9488,#0f766e)'}}>
                  {ci+1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{cluster.city}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">
                      {cluster.members.length} accounts
                    </span>
                    {Object.entries(cluster.typeCounts).map(([t,n])=>(
                      <span key={t} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{n} {t}</span>
                    ))}
                  </div>
                </div>
                <Ic n={isOpen?'alert':'chevR'} cls={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen?'rotate-180':''}`}/>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {/* Account pills */}
                  <div className="p-4 border-b border-gray-50 dark:border-gray-800/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Accounts in Cluster</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.members.map(a=>(
                        <button key={a.id}
                          onClick={()=>dispatch({type:'NAV',view:'account-detail',params:{id:a.id}})}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition">
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meta Ad Plan — editable */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Recommended Meta Ad Plan</p>
                    {(()=>{
                      const ep  = editPlans[cluster.id] || {};
                      const upd = (k,v) => setEditPlans(x=>({...x,[cluster.id]:{...x[cluster.id],[k]:v}}));
                      const iCls = "w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500";
                      const lCls = "block text-xs font-semibold text-gray-500 mb-1";
                      return (
                        <div className="space-y-3 mb-4">
                          <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Copy</p>
                              <button onClick={()=>generatePlanCopy(cluster)} disabled={!!planGenerating[cluster.id]}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {planGenerating[cluster.id]
                                  ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Writing…</>
                                  : '✨ Write with AI'}
                              </button>
                            </div>
                            <input
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-400"
                              placeholder="Extra instructions… e.g. Focus on patio season"
                              value={ep.aiInstructions||''}
                              onChange={e=>upd('aiInstructions',e.target.value)}/>
                          </div>
                          <div>
                            <label className={lCls}>🎯 Angle</label>
                            <input className={iCls} value={ep.angle||''} onChange={e=>upd('angle',e.target.value)}/>
                          </div>
                          <div>
                            <label className={lCls}>💬 Copy</label>
                            <textarea className={iCls} rows={3} style={{resize:'vertical'}} value={ep.copy||''} onChange={e=>upd('copy',e.target.value)}/>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={lCls}>👆 CTA</label>
                              <select className={iCls} value={ep.cta||''} onChange={e=>upd('cta',e.target.value)}>
                                <option>Shop Now</option>
                                <option>Learn More</option>
                                <option>Find Us</option>
                                <option>Get Directions</option>
                              </select>
                            </div>
                            <div>
                              <label className={lCls}>💰 Budget (CAD $)</label>
                              <div className="flex gap-1.5">
                                <input type="number" min={5} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500" value={ep.budget||''} onChange={e=>upd('budget',e.target.value)} placeholder="30"/>
                                <select value={ep.budgetType||'daily'} onChange={e=>upd('budgetType',e.target.value)}
                                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                                  <option value="daily">Daily</option>
                                  <option value="lifetime">Lifetime</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className={lCls}>📱 Format</label>
                            <input className={iCls} value={ep.format||''} onChange={e=>upd('format',e.target.value)}/>
                          </div>
                          <div>
                            <label className={lCls}>⏰ Ad Schedule</label>
                            <div className="flex gap-1.5 items-center flex-wrap">
                              <select value={ep.schedMode||'all'} onChange={e=>upd('schedMode',e.target.value)}
                                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                                <option value="all">Run all day (24 hrs)</option>
                                <option value="hours">Specific hours</option>
                              </select>
                              {ep.schedMode==='hours' && (
                                <React.Fragment>
                                  <select value={ep.schedStartHour||'17'} onChange={e=>upd('schedStartHour',e.target.value)}
                                    className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    {Array.from({length:24},(_,h)=>{const hr=h%24,mer=hr<12?'AM':'PM',d=(hr%12)||12;return <option key={h} value={String(h)}>{d} {mer}</option>;})}
                                  </select>
                                  <span className="text-xs text-gray-400">to</span>
                                  <select value={ep.schedEndHour||'24'} onChange={e=>upd('schedEndHour',e.target.value)}
                                    className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    {Array.from({length:24},(_,i)=>{const h=i+1,hr=h%24,mer=hr<12?'AM':'PM',d=(hr%12)||12;return <option key={h} value={String(h)}>{d} {mer}</option>;})}
                                  </select>
                                </React.Fragment>
                              )}
                            </div>
                            {ep.schedMode==='hours' && (
                              <div className="flex gap-1 flex-wrap mt-1.5">
                                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>{
                                  const on=(ep.schedDays||[0,1,2,3,4,5,6]).includes(i);
                                  return <button key={i} type="button"
                                    onClick={()=>{const cur=ep.schedDays||[0,1,2,3,4,5,6]; upd('schedDays', cur.includes(i)?cur.filter(x=>x!==i):[...cur,i]);}}
                                    className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${on?'bg-teal-600 text-white border-teal-600':'border-gray-300 dark:border-gray-600 text-gray-500'}`}>{d}</button>;
                                })}
                              </div>
                            )}
                            {ep.schedMode==='hours' && <p className="text-[10px] text-gray-400 mt-1">Meta schedules on full hours; hourly runs need a Lifetime budget + end date (auto-applied).</p>}
                          </div>
                          <div>
                            <label className={lCls}>📍 Audience</label>
                            <input className={iCls} value={ep.audience||''} onChange={e=>upd('audience',e.target.value)}/>
                          </div>
                          <div>
                            <label className={lCls}>🎯 Location targeting</label>
                            <select className={iCls} value={ep.locationTypes||'home,recent'} onChange={e=>upd('locationTypes',e.target.value)}>
                              <option value="home,recent">Living in or recently in this area</option>
                              <option value="home">People who live here</option>
                              <option value="recent">People recently here</option>
                              <option value="travel_in">People traveling here</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={lCls}>📅 Start Date &amp; Time</label>
                              <input type="datetime-local" className={iCls} value={ep.startDate||''} onChange={e=>upd('startDate',e.target.value)}/>
                            </div>
                            <div>
                              <label className={lCls}>🏁 End Date &amp; Time</label>
                              <input type="datetime-local" className={iCls} value={ep.endDate||''} onChange={e=>upd('endDate',e.target.value)}/>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className={lCls}>👤 Age Min</label>
                              <select className={iCls} value={ep.ageMin||'25'} onChange={e=>upd('ageMin',e.target.value)}>
                                {['19','21','25','30','35','40','45','50','55','60','65'].map(a=><option key={a} value={a}>{a}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className={lCls}>Age Max</label>
                              <select className={iCls} value={ep.ageMax||'54'} onChange={e=>upd('ageMax',e.target.value)}>
                                {['30','35','40','45','50','54','60'].map(a=><option key={a} value={a}>{a}</option>)}
                                <option value="65">65+</option>
                              </select>
                            </div>
                            <div>
                              <label className={lCls}>Gender</label>
                              <select className={iCls} value={ep.gender||'all'} onChange={e=>upd('gender',e.target.value)}>
                                <option value="all">All</option>
                                <option value="male">Men</option>
                                <option value="female">Women</option>
                              </select>
                            </div>
                          </div>

                          {/* ── Radio / Audio Ad — Spotify ─────────────────── */}
                          {(()=>{
                            const sp = spotifyStatus[cluster.id] || {};
                            return (
                            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">🎧 Radio / Audio Ad — Spotify</p>
                                <button onClick={()=>generateRadioScript(cluster)} disabled={!!radioGenerating[cluster.id]}
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors">
                                  {radioGenerating[cluster.id]
                                    ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Writing…</>
                                    : '✨ Write 30s Script'}
                                </button>
                              </div>
                              <textarea className={iCls} rows={4} style={{resize:'vertical'}}
                                placeholder="30-second spoken script (60–75 words)… or click Write 30s Script"
                                value={ep.radioScript||''} onChange={e=>upd('radioScript',e.target.value)}/>
                              {ep.radioScript && (
                                <p className="text-[10px] text-gray-400">
                                  ~{ep.radioScript.trim().split(/\s+/).length} words · {Math.round(ep.radioScript.trim().split(/\s+/).length / 2.4)}s spoken
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={lCls}>Tagline (max 40 chars)</label>
                                  <input className={iCls} maxLength={40} value={ep.radioTagline||''} onChange={e=>upd('radioTagline',e.target.value)} placeholder="Premium agave tequila"/>
                                </div>
                                <div>
                                  <label className={lCls}>🎵 Audio File (MP3/WAV, ≤30s)</label>
                                  <label className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 hover:border-emerald-500 cursor-pointer transition truncate">
                                    {ep.radioAudioName || 'Choose audio…'}
                                    <input type="file" accept="audio/mpeg,audio/wav,audio/ogg" className="hidden" onChange={e=>uploadRadioAudio(cluster, e)}/>
                                  </label>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={()=>pushToSpotify(cluster)} disabled={sp.loading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-black hover:bg-gray-800 text-white disabled:opacity-50 transition-colors">
                                  {sp.loading
                                    ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Creating…</>
                                    : '🎧 Push to Spotify'}
                                </button>
                                <p className="text-[10px] text-gray-400">Uses the budget, dates &amp; demographics above · created with delivery OFF</p>
                              </div>
                              {sp.error && (
                                <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                                  {sp.error}
                                  {/secret|token|SETUP/i.test(sp.error) && <p className="mt-1 text-gray-500">Complete the one-time setup in SPOTIFY-ADS-SETUP.md (developer app + refresh token + deploy the spotify-ads edge function).</p>}
                                </div>
                              )}
                              {sp.result && (
                                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/20 rounded-lg p-2 space-y-0.5">
                                  <p>✅ Campaign created (ID {String(sp.result.campaignId||'').slice(0,8)}…) · Ad set {String(sp.result.adSetId||'').slice(0,8)}…{sp.result.adId ? ` · Ad ${String(sp.result.adId).slice(0,8)}…` : ''}</p>
                                  {sp.result.note && <p className="text-gray-500">{sp.result.note}</p>}
                                  <a href={sp.result.manageUrl||'https://adsmanager.spotify.com'} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Open Spotify Ads Manager ↗</a>
                                </div>
                              )}
                            </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* Creative Specs — clickable format cards */}
                    {(()=>{
                      const fmts = [
                        {label:'Feed Square',    size:'1080 × 1080', ratio:'1:1',    fk:'feed_square'},
                        {label:'Feed Portrait',  size:'1080 × 1350', ratio:'4:5',    fk:'feed_portrait'},
                        {label:'Stories / Reels',size:'1080 × 1920', ratio:'9:16',   fk:'stories_reels'},
                        {label:'Right Column',   size:'1200 × 628',  ratio:'1.91:1', fk:'right_column'},
                      ];
                      const fmtImages = (editPlans[cluster.id]||{}).formatImages || {};
                      const pickerKey = formatPicker?.clusterId===cluster.id ? formatPicker.formatKey : null;
                      return (
                        <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Creative Specs — Click a size to assign an image</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {fmts.map(s=>{
                              const assigned = fmtImages[s.fk];
                              const isOpen   = pickerKey === s.fk;
                              return (
                                <div key={s.fk}>
                                  <button onClick={()=>setFormatPicker(isOpen ? null : {clusterId:cluster.id,formatKey:s.fk})}
                                    className={`w-full text-left p-2 rounded-lg border transition-all ${isOpen ? 'border-teal-500 ring-2 ring-teal-500/20 bg-white dark:bg-gray-900' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-teal-400'}`}>
                                    {assigned ? (
                                      <div className="relative w-full h-14 rounded overflow-hidden mb-1">
                                        <img src={assigned} alt={s.label} className="w-full h-full object-cover"/>
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                          <span className="text-white text-[10px] font-medium">Change</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full h-10 rounded border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center mb-1 text-gray-400 text-[10px]">
                                        + Add image
                                      </div>
                                    )}
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{s.label}</p>
                                    <p className="text-[10px] font-mono text-teal-600 dark:text-teal-400">{s.size} · {s.ratio}</p>
                                  </button>
                                  {isOpen && (
                                    <div className="mt-1 p-2 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-gray-900 space-y-2">
                                      <div className="flex gap-2">
                                        <button onClick={()=>formatFileRef.current?.click()} disabled={formatUploading}
                                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition">
                                          {formatUploading ? '⏳ Uploading…' : '⬆ Upload'}
                                        </button>
                                        {assigned && (
                                          <button onClick={()=>setFormatImage(cluster.id,s.fk,'')}
                                            className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 rounded-lg border border-red-200 hover:border-red-400 transition">
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                      {(state.adCreatives||[]).length > 0 && (
                                        <div>
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase">Or choose from library</p>
                                            {libGroups.length > 0 && (
                                              <select value={libGroupFilter} onChange={e=>setLibGroupFilter(e.target.value)}
                                                className="px-1.5 py-0.5 text-[10px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 focus:outline-none">
                                                <option value="all">📁 All campaigns</option>
                                                <option value="ungrouped">Ungrouped</option>
                                                {libGroups.map(g=><option key={g} value={g}>{g}</option>)}
                                              </select>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                                            {libFiltered
                                              .filter(c=>!c.format||c.format===s.fk||c.format==='other')
                                              .concat(libFiltered.filter(c=>c.format&&c.format!==s.fk&&c.format!=='other'))
                                              .slice(0,12)
                                              .map(c=>(
                                                <button key={c.id} onClick={()=>setFormatImage(cluster.id,s.fk,c.publicUrl)}
                                                  className={`relative rounded overflow-hidden border-2 transition-all text-left ${fmtImages[s.fk]===c.publicUrl?'border-teal-500':'border-transparent hover:border-teal-400'}`}>
                                                  <img src={c.publicUrl} alt={c.name} className="w-full h-10 object-cover"/>
                                                  <div className="bg-gray-900/80 px-1 py-0.5">
                                                    <p className="text-[9px] text-white leading-tight truncate">{c.name}</p>
                                                    {(c.width && c.height) && <p className="text-[9px] text-gray-400 leading-tight">{c.width}×{c.height}</p>}
                                                    {c.formatLabel && <p className="text-[9px] text-teal-300 leading-tight truncate">{c.formatLabel}</p>}
                                                  </div>
                                                </button>
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">JPG or PNG · max 30 MB · &lt;20% text overlay recommended</p>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">🖼 Image Notes</label>
                          <input
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Production notes…"
                            value={(editPlans[cluster.id]||{}).imageNotes||''}
                            onChange={e=>setEditPlans(x=>({...x,[cluster.id]:{...x[cluster.id],imageNotes:e.target.value}}))}/>
                        </div>
                      );
                    })()}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <a href={metaUrl} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition">
                        <Ic n="scanads" cls="w-3.5 h-3.5"/> Meta Ad Library ↗
                      </a>
                      <button onClick={()=>openMetaModal(cluster)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition">
                        🚀 Push to Meta
                      </button>
                      <a href={googleUrl} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-700 font-medium transition">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Google Ads ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Push to Meta Modal ─────────────────────────────────────────────── */}
      {metaModal && (
        <Modal open={true} onClose={()=>setMetaModal(null)} title={`🚀 Push to Meta · ${metaModal.city}`}>
          {metaStatus.result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-1">✅ Campaign created!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{metaStatus.result.message}</p>
                <div className="mt-2 space-y-0.5 text-xs text-gray-500 font-mono">
                  <p>Campaign: {metaStatus.result.campaignId}</p>
                  <p>Ad Set: {metaStatus.result.adSetId}</p>
                  <p>Ad: {metaStatus.result.adId}</p>
                </div>
              </div>
              <a href={metaStatus.result.campaignUrl} target="_blank" rel="noopener"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition">
                <Ic n="ad" cls="w-4 h-4"/> Open in Ads Manager ↗
              </a>
              <p className="text-xs text-gray-400 text-center">Campaign is PAUSED — activate in Ads Manager when ready.</p>
              <Btn variant="secondary" onClick={()=>setMetaModal(null)} cls="w-full">Close</Btn>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">Campaign will be created in <strong>PAUSED</strong> state — nothing spends until you activate it in Ads Manager.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Meta Access Token <span className="font-normal text-gray-400">(Graph API Explorer → Generate Token — saved locally)</span>
                </label>
                <input type="password" value={metaForm.metaToken||''} onChange={e=>setMetaForm(f=>({...f,metaToken:e.target.value}))} placeholder="EAAx..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              {/* AI Copy Generator */}
              <div className="rounded-xl border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">✨ AI Ad Copy</p>
                  <button onClick={generateAdCopy} disabled={copyGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {copyGenerating
                      ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Generating…</>
                      : '✨ Generate with AI'}
                  </button>
                </div>
                {state.voiceTone && (
                  <div>
                    <button onClick={()=>setShowVoiceTone(v=>!v)}
                      className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition-colors">
                      <span>🎙 Voice &amp; Tone Reference</span>
                      <span>{showVoiceTone ? '▲ Hide' : '▼ Show'}</span>
                    </button>
                    {showVoiceTone && (
                      <div className="mt-1 px-3 py-2 text-xs rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {state.voiceTone}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Extra instructions <span className="font-normal text-gray-400">(optional — guides the AI for this generation)</span></label>
                  <input type="text" value={metaForm.aiInstructions||''} onChange={e=>setMetaForm(f=>({...f,aiInstructions:e.target.value}))}
                    placeholder="e.g. Make it funny, mention Cinco de Mayo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-400"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Headline <span className="font-normal text-gray-400">({(metaForm.headline||'').length}/40 chars)</span></label>
                  <input type="text" maxLength={40} value={metaForm.headline||''} onChange={e=>setMetaForm(f=>({...f,headline:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Ad Copy <span className="font-normal text-gray-400">(primary text)</span></label>
                  <textarea value={metaForm.copy||''} onChange={e=>setMetaForm(f=>({...f,copy:e.target.value}))} rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Link Description <span className="font-normal text-gray-400">(shown below image)</span></label>
                  <input type="text" value={metaForm.description||''} onChange={e=>setMetaForm(f=>({...f,description:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Budget (CAD $)</label>
                  <div className="flex gap-2">
                    <input type="number" min={5} max={5000} value={metaForm.budget} onChange={e=>setMetaForm(f=>({...f,budget:e.target.value}))}
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                    <select value={metaForm.budgetType||'daily'} onChange={e=>setMetaForm(f=>({...f,budgetType:e.target.value}))}
                      className="px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="daily">Daily</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Call to Action</label>
                  <select value={metaForm.ctaType} onChange={e=>setMetaForm(f=>({...f,ctaType:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="SHOP_NOW">Shop Now</option>
                    <option value="GET_DIRECTIONS">Get Directions</option>
                    <option value="CONTACT_US">Contact Us</option>
                  </select>
                </div>
              </div>

              {/* ── Schedule ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">📅 Start Date &amp; Time</label>
                  <input type="datetime-local" value={metaForm.startDate||''} onChange={e=>setMetaForm(f=>({...f,startDate:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">🏁 End Date &amp; Time</label>
                  <input type="datetime-local" value={metaForm.endDate||''} onChange={e=>setMetaForm(f=>({...f,endDate:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">⏰ Ad Schedule</label>
                <div className="flex gap-2 items-center flex-wrap">
                  <select value={metaForm.schedMode||'all'} onChange={e=>setMetaForm(f=>({...f,schedMode:e.target.value}))}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="all">Run all day (24 hours)</option>
                    <option value="hours">Specific hours</option>
                  </select>
                  {metaForm.schedMode==='hours' && (
                    <React.Fragment>
                      <select value={metaForm.schedStartHour||'17'} onChange={e=>setMetaForm(f=>({...f,schedStartHour:e.target.value}))}
                        className="px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                        {Array.from({length:24},(_,h)=>{const hr=h%24,mer=hr<12?'AM':'PM',d=(hr%12)||12;return <option key={h} value={String(h)}>{d} {mer}</option>;})}
                      </select>
                      <span className="text-xs text-gray-400">to</span>
                      <select value={metaForm.schedEndHour||'24'} onChange={e=>setMetaForm(f=>({...f,schedEndHour:e.target.value}))}
                        className="px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                        {Array.from({length:24},(_,i)=>{const h=i+1,hr=h%24,mer=hr<12?'AM':'PM',d=(hr%12)||12;return <option key={h} value={String(h)}>{d} {mer}</option>;})}
                      </select>
                    </React.Fragment>
                  )}
                </div>
                {metaForm.schedMode==='hours' && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>{
                      const on=(metaForm.schedDays||[]).includes(i);
                      return <button key={i} type="button"
                        onClick={()=>setMetaForm(f=>{const cur=f.schedDays||[];return {...f, schedDays: cur.includes(i)?cur.filter(x=>x!==i):[...cur,i]};})}
                        className={`px-2 py-1 text-xs rounded border font-medium ${on?'bg-teal-600 text-white border-teal-600':'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>{d}</button>;
                    })}
                  </div>
                )}
                {metaForm.schedMode==='hours' && <p className="text-[10px] text-gray-400 mt-1">Meta schedules on full hours. Hourly scheduling requires a Lifetime budget and an end date — if you leave the budget on Daily we'll convert it to lifetime automatically.</p>}
              </div>

              {/* ── Demographics ─────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">👤 Age Min</label>
                  <select value={metaForm.ageMin} onChange={e=>setMetaForm(f=>({...f,ageMin:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['19','21','25','30','35','40','45','50','55','60','65'].map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Age Max</label>
                  <select value={metaForm.ageMax} onChange={e=>setMetaForm(f=>({...f,ageMax:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {['30','35','40','45','50','54','60'].map(a=><option key={a} value={a}>{a}</option>)}
                    <option value="65">65+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Gender</label>
                  <select value={metaForm.gender||'all'} onChange={e=>setMetaForm(f=>({...f,gender:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="all">All</option>
                    <option value="male">Men</option>
                    <option value="female">Women</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">📍 Location targeting <span className="font-normal text-gray-400">(who to reach in the radius)</span></label>
                <select value={metaForm.locationTypes||'home,recent'} onChange={e=>setMetaForm(f=>({...f,locationTypes:e.target.value}))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="home,recent">Living in or recently in this area (default)</option>
                  <option value="home">People who live in this area</option>
                  <option value="recent">People recently in this area</option>
                  <option value="travel_in">People traveling in this area</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Website URL</label>
                <input type="url" value={metaForm.websiteUrl} onChange={e=>setMetaForm(f=>({...f,websiteUrl:e.target.value}))} placeholder="https://suenostequila.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Facebook Page ID <span className="font-normal text-gray-400">(FB Page → About → Page Transparency)</span>
                </label>
                <input type="text" value={metaForm.pageId} onChange={e=>setMetaForm(f=>({...f,pageId:e.target.value}))} placeholder="e.g. 123456789012345"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Creative Image <span className="font-normal text-gray-400">(optional — leave blank for link-only ad)</span></label>
                {metaForm.imageUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={metaForm.imageUrl} alt="selected" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{metaForm.imageUrl}</p>
                      <button onClick={()=>setMetaForm(f=>({...f,imageUrl:''}))} className="text-xs text-red-500 hover:text-red-700 mt-0.5">Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button onClick={()=>setShowCreativeLib(v=>!v)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-teal-400 hover:text-teal-500 transition-colors">
                      🖼 {showCreativeLib ? 'Close Library' : `Choose from Library (${(state.adCreatives||[]).length})`}
                    </button>
                    {showCreativeLib && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        {(state.adCreatives||[]).length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No creatives uploaded yet — go to Ad Creatives in the sidebar.</p>
                        ) : (
                          <>
                          {libGroups.length > 0 && (
                            <div className="px-2 pt-2">
                              <select value={libGroupFilter} onChange={e=>setLibGroupFilter(e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500">
                                <option value="all">📁 All campaigns ({(state.adCreatives||[]).length})</option>
                                <option value="ungrouped">Ungrouped</option>
                                {libGroups.map(g=><option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                          )}
                          <div className="max-h-52 overflow-y-auto p-2 grid grid-cols-3 gap-2">
                            {libFiltered.length === 0 ? (
                              <p className="col-span-3 text-xs text-gray-400 text-center py-3">No creatives in this campaign</p>
                            ) : libFiltered.map(c=>(
                              <button key={c.id} onClick={()=>{setMetaForm(f=>({...f,imageUrl:c.publicUrl}));setShowCreativeLib(false);}}
                                className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-teal-500 transition-all">
                                <img src={c.publicUrl} alt={c.name} className="w-full h-16 object-cover"/>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                                  <p className="w-full bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{c.name}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                          </>
                        )}
                      </div>
                    )}
                    <input type="url" value={metaForm.imageUrl||''} onChange={e=>setMetaForm(f=>({...f,imageUrl:e.target.value}))} placeholder="…or paste a public image URL"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                  </div>
                )}
              </div>
              {/* Campaign Settings */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Campaign Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Objective</label>
                    <select value={metaForm.objective||'OUTCOME_TRAFFIC'} onChange={e=>setMetaForm(f=>({...f,objective:e.target.value}))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="OUTCOME_TRAFFIC">Traffic</option>
                      <option value="OUTCOME_AWARENESS">Awareness</option>
                      <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                      <option value="OUTCOME_LEADS">Leads</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Optimization Goal</label>
                    <select value={metaForm.optimizationGoal||'LINK_CLICKS'} onChange={e=>setMetaForm(f=>({...f,optimizationGoal:e.target.value}))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="LINK_CLICKS">Link Clicks</option>
                      <option value="LANDING_PAGE_VIEWS">Landing Page Views</option>
                      <option value="REACH">Reach</option>
                      <option value="IMPRESSIONS">Impressions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bid Strategy</label>
                    <select value={metaForm.bidStrategy||'LOWEST_COST_WITHOUT_CAP'} onChange={e=>setMetaForm(f=>({...f,bidStrategy:e.target.value}))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="LOWEST_COST_WITHOUT_CAP">Lowest Cost (auto)</option>
                      <option value="COST_CAP">Cost Cap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Age Range</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="number" min={18} max={65} value={metaForm.ageMin||'25'} onChange={e=>setMetaForm(f=>({...f,ageMin:e.target.value}))}
                        className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                      <span className="text-xs text-gray-400">–</span>
                      <input type="number" min={18} max={65} value={metaForm.ageMax||'54'} onChange={e=>setMetaForm(f=>({...f,ageMax:e.target.value}))}
                        className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 space-y-0.5">
                <p>📍 Targeting: Canada-wide · Ages {metaForm.ageMin||25}–{metaForm.ageMax||54}</p>
                <p>🏪 {metaModal.members.length} accounts in this cluster</p>
              </div>
              {metaStatus.error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Error: {metaStatus.error}</p>
                </div>
              )}
              <label className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={!!metaForm.launchActive} onChange={e=>setMetaForm(f=>({...f,launchActive:e.target.checked}))} />
                <span className="text-xs text-amber-800 dark:text-amber-300"><b>Launch live (ACTIVE)</b> — the campaign, ad set &amp; ad turn on immediately and start spending. Leave off to create everything PAUSED for review in Ads Manager.</span>
              </label>
              <div className="flex gap-2 pt-1">
                <Btn variant="secondary" onClick={()=>setMetaModal(null)} cls="flex-1">Cancel</Btn>
                <Btn onClick={pushToMeta} cls="flex-1"
                  disabled={metaStatus.loading||!metaForm.metaToken||!metaForm.pageId||!metaForm.copy||!metaForm.websiteUrl}>
                  {metaStatus.loading ? '⏳ Creating…' : (metaForm.launchActive ? '🚀 Launch Live' : '🚀 Create (Paused)')}
                </Btn>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── AD CREATIVE LIBRARY VIEW ─────────────────────────────────────────────────
function AdCreativesView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  const [uploading, setUploading] = React.useState(false);
  const [filterFmt, setFilterFmt] = React.useState('all');
  const [form, setForm] = React.useState({ name:'', format:'feed_square', notes:'', group:'' });
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [lightbox, setLightbox] = React.useState(null);

  const FORMAT_OPTIONS = [
    { value:'feed_square',   label:'Feed Square (1:1)',        size:'1080×1080' },
    { value:'feed_portrait', label:'Feed Portrait (4:5)',      size:'1080×1350' },
    { value:'stories_reels', label:'Stories / Reels (9:16)',   size:'1080×1920' },
    { value:'right_column',  label:'Right Column (1.91:1)',    size:'1200×628'  },
    { value:'radio_15',      label:'Radio :15 (audio)',         size:'MP3/WAV ≤15s' },
    { value:'radio_30',      label:'Radio :30 (audio)',         size:'MP3/WAV ≤30s' },
    { value:'other',         label:'Other',                     size:''          },
  ];
  const isRadioFmt = f => f === 'radio_15' || f === 'radio_30';

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !form.name) return;
    setUploading(true);
    try {
      await dbSaveCreative(dispatch, { ...form, file });
      setForm({ name:'', format:'feed_square', notes:'', group:'' });
      setFile(null); setPreview(null);
      showToast(dispatch, 'Creative uploaded!', 'success');
    } catch(err) {
      showToast(dispatch, String(err), 'error');
    } finally { setUploading(false); }
  }

  async function handleDelete(creative) {
    if (!confirm(`Delete "${creative.name}"? This cannot be undone.`)) return;
    await dbDeleteCreative(dispatch, creative.id, creative.storagePath);
    showToast(dispatch, 'Deleted', 'success');
  }

  const [filterGroup, setFilterGroup] = React.useState('all');
  // Distinct group names across the library
  const groups = [...new Set((state.adCreatives||[]).map(c=>c.group).filter(Boolean))].sort();
  async function setGroup(creative, group) {
    if ((group||'').trim() === (creative.group||'')) return;
    try {
      await dbSetCreativeGroup(dispatch, creative.id, group);
      showToast(dispatch, group?.trim() ? `Moved to "${group.trim()}"` : 'Removed from campaign', 'success');
    } catch(e) { showToast(dispatch, String(e), 'error'); }
  }

  const creatives = (state.adCreatives || [])
    .filter(c => filterFmt === 'all' || c.format === filterFmt)
    .filter(c => filterGroup === 'all'
      || (filterGroup === 'ungrouped' && !c.group)
      || c.group === filterGroup);

  const fmtColors = {
    feed_square:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    feed_portrait: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    stories_reels: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    right_column:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    radio_15:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    radio_30:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    other:         'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header hero */}
        <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 text-white shadow-sm">
          <h1 className="text-xl font-black tracking-tight">🖼 Ad Creative Library</h1>
          <p className="text-xs text-teal-100/70 mt-0.5">Upload, organize, and reuse ad images &amp; audio across your campaigns</p>
        </div>


        {/* Upload Form — admin only */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Upload New Creative</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    placeholder="e.g. Suenos Summer Feed"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Format *</label>
                  <select value={form.format} onChange={e=>setForm(f=>({...f,format:e.target.value}))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {FORMAT_OPTIONS.map(o=>(
                      <option key={o.value} value={o.value}>{o.label}{o.size ? ` — ${o.size}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">📁 Campaign <span className="font-normal text-gray-400">(type new or pick existing)</span></label>
                  <input list="creative-groups" value={form.group} onChange={e=>setForm(f=>({...f,group:e.target.value}))}
                    placeholder="e.g. Summer 2026 Launch"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                  <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Variant, or any notes…"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {isRadioFmt(form.format) ? '🎵 Audio File *' : 'Image File *'}{' '}
                  <span className="font-normal text-gray-400">{isRadioFmt(form.format) ? '(MP3, WAV, or OGG)' : '(JPG or PNG, max 30 MB)'}</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-teal-400 hover:text-teal-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    {file ? file.name : 'Choose file…'}
                    <input type="file" accept={isRadioFmt(form.format) ? 'audio/mpeg,audio/wav,audio/ogg' : 'image/jpeg,image/png,image/webp'} onChange={pickFile} className="hidden"/>
                  </label>
                  {preview && !isRadioFmt(form.format) && (
                    <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700"/>
                  )}
                  {file && isRadioFmt(form.format) && (
                    <span className="text-xs text-teal-600">🎵 {(file.size/1024).toFixed(0)} KB</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={uploading || !file || !form.name}
                  className="px-5 py-2 text-sm font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {uploading ? '⏳ Uploading…' : '⬆️ Upload Creative'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Filter:</span>
          {['all', 'feed_square', 'feed_portrait', 'stories_reels', 'right_column', 'radio_15', 'radio_30', 'other'].map(f=>(
            <button key={f} onClick={()=>setFilterFmt(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filterFmt===f
                  ? 'bg-teal-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-teal-400'
              }`}>
              {f === 'all' ? `All (${(state.adCreatives||[]).length})` : FORMAT_OPTIONS.find(o=>o.value===f)?.label || f}
            </button>
          ))}
          {groups.length > 0 && (
            <select value={filterGroup} onChange={e=>setFilterGroup(e.target.value)}
              className="ml-auto px-3 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="all">📁 All campaigns</option>
              <option value="ungrouped">Ungrouped</option>
              {groups.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          )}
        </div>
        {/* Shared datalist for campaign name suggestions */}
        <datalist id="creative-groups">
          {groups.map(g=><option key={g} value={g}/>)}
        </datalist>

        {/* Grid */}
        {creatives.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🖼</div>
            <p className="font-medium">{filterFmt === 'all' ? 'No creatives uploaded yet' : 'No creatives in this format'}</p>
            {isAdmin && filterFmt === 'all' && <p className="text-sm mt-1">Upload your first ad image above.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {creatives.map(c=>(
              <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group relative">
                <div className="relative">
                  {isRadioFmt(c.format) ? (
                    <div className="w-full h-36 bg-gray-900 flex flex-col items-center justify-center gap-2 px-3">
                      <span className="text-3xl">🎧</span>
                      <audio controls src={c.publicUrl} className="w-full" style={{height:'32px'}} preload="none"/>
                    </div>
                  ) : (
                  <img src={c.publicUrl} alt={c.name}
                    className="w-full h-36 object-cover cursor-zoom-in"
                    onClick={()=>setLightbox(c)}/>
                  )}
                  {isAdmin && (
                    <button onClick={()=>handleDelete(c)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded-full font-medium ${fmtColors[c.format]||fmtColors.other}`}>
                    {FORMAT_OPTIONS.find(o=>o.value===c.format)?.label || c.format}
                  </span>
                  {c.notes && <p className="text-[10px] text-gray-400 mt-1 truncate">{c.notes}</p>}
                  {/* Campaign grouping — type a new name or pick an existing one */}
                  {isAdmin ? (
                    <input list="creative-groups" defaultValue={c.group || ''} placeholder="📁 Add to campaign…"
                      onBlur={e=>setGroup(c, e.target.value)}
                      onKeyDown={e=>{ if (e.key === 'Enter') e.target.blur(); }}
                      className="w-full mt-1.5 px-1.5 py-1 text-[10px] rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500"/>
                  ) : c.group ? (
                    <p className="text-[10px] text-teal-600 mt-1 truncate">📁 {c.group}</p>
                  ) : null}
                  <div className="flex gap-1 mt-2">
                    <a href={c.publicUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center text-[10px] py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      Open ↗
                    </a>
                    <button onClick={()=>{navigator.clipboard.writeText(c.publicUrl); showToast(dispatch,'URL copied!','success');}}
                      className="flex-1 text-center text-[10px] py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      Copy URL
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setLightbox(null)}>
          <div className="relative max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
            <img src={lightbox.publicUrl} alt={lightbox.name} className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]"/>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">{lightbox.name}</p>
                {lightbox.notes && <p className="text-gray-400 text-xs">{lightbox.notes}</p>}
              </div>
              <button onClick={()=>setLightbox(null)} className="text-white/70 hover:text-white text-sm">✕ Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AD PERFORMANCE VIEW ──────────────────────────────────────────────────────
// Comment thread + reply box for the Facebook post behind one ad (admin only).
function AdCommentsPanel({ adId }) {
  const { dispatch } = useApp();
  const [comments, setComments] = useState([]);
  const [note, setNote]     = useState('');
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  // supabase-js collapses any non-2xx into a generic "non-2xx status code" message;
  // the real error text is in error.context (the Response body). Dig it out.
  const fnError = async (error, data, fallback) => {
    if (data && data.error) return data.error;
    if (error && error.context && typeof error.context.json === 'function') {
      try { const b = await error.context.json(); if (b && b.error) return b.error; } catch (e) {}
    }
    return (error && error.message) || fallback;
  };

  const load = async () => {
    setLoading(true); setErr(''); setNote('');
    try {
      const { data, error } = await sb.functions.invoke('meta-comments', { body:{ action:'list', adId } });
      if (error || (data && data.error)) throw new Error(await fnError(error, data, 'Load failed'));
      setComments(data.comments || []); if (data.note) setNote(data.note);
    } catch (e) { setErr(e.message || String(e)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [adId]);

  const sendReply = async (targetId) => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const { data, error } = await sb.functions.invoke('meta-comments', { body:{ action:'reply', commentId: targetId, message: replyText.trim() } });
      if (error || (data && data.error)) throw new Error(await fnError(error, data, 'Reply failed'));
      showToast(dispatch, 'Reply posted');
      setReplyText(''); setReplyFor(null);
      await load();
    } catch (e) { showToast(dispatch, 'Reply failed: '+(e.message||e), 'error'); }
    setPosting(false);
  };

  if (loading) return <p className="text-xs text-gray-500 py-2">Loading comments…</p>;
  if (err)     return <p className="text-xs text-red-600 dark:text-red-400 py-2">{err}</p>;
  return (
    <div className="mt-2 space-y-2">
      {note && <p className="text-xs text-gray-500">{note}</p>}
      {comments.length===0 && !note && <p className="text-xs text-gray-500">No comments yet.</p>}
      {comments.map(c => (
        <div key={c.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
          <p className="text-[11px] text-gray-500">{c.from}{c.createdTime ? ' · '+new Date(c.createdTime).toLocaleDateString() : ''}{c.likeCount ? ` · 👍 ${c.likeCount}` : ''}</p>
          <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{c.message || '(no text)'}</p>
          {replyFor===c.id ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <input value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write a reply…"
                className="flex-1 min-w-[140px] text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700" />
              <button disabled={posting} onClick={()=>sendReply(c.id)} className="text-xs font-semibold text-white bg-teal-600 rounded px-3 py-1 disabled:opacity-50">{posting?'…':'Reply'}</button>
              <button onClick={()=>{setReplyFor(null);setReplyText('');}} className="text-xs text-gray-500">Cancel</button>
            </div>
          ) : (
            <button onClick={()=>{setReplyFor(c.id);setReplyText('');}} className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline mt-1">Reply</button>
          )}
        </div>
      ))}
      <button onClick={load} className="text-[11px] text-gray-500 underline">Refresh comments</button>
    </div>
  );
}

// ── Simple inline icons (bigger + cleaner than emoji) ────────────────────────
const _Ico = (children, filled) => ({ className }) => (
  <svg className={className||'w-5 h-5'} viewBox="0 0 24 24"
    fill={filled?'currentColor':'none'} stroke={filled?'none':'currentColor'}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IcoPlay    = _Ico(<path d="M7 4v16l13-8z"/>, true);
const IcoPause   = _Ico(<><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>, true);
const IcoRefresh = _Ico(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>);
const IcoExternal= _Ico(<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>);
const IcoLayers  = _Ico(<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>);
const IcoSpark   = _Ico(<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/>, true);
const IcoChat    = _Ico(<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>);
const IcoHeart   = _Ico(<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>, true);
const IcoShare   = _Ico(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></>);

function AdPerformanceView() {
  const { state, dispatch } = useApp();
  const isAdmin = state.user?.role === 'admin';
  // Reps see campaigns whose city falls within a region they have accounts in
  const repRegions = isAdmin ? null : new Set(
    state.accounts.filter(a=>a.assignedRep===state.user?.id).map(a=>a.region).filter(Boolean)
  );
  const visibleCampaigns = (state.metaCampaigns || []).filter(c => {
    if (isAdmin) return true;
    const campaignRegion = cityToRegion(c.city) || c.city;
    return repRegions.has(campaignRegion);
  });
  const allMetaCampaigns = visibleCampaigns.filter(c => (c.platform || 'meta') === 'meta');
  const [campFilter, setCampFilter] = React.useState('all');   // 'all' | region | `city:<city>`
  const [campSort, setCampSort]     = React.useState('newest'); // newest | spend | city
  // Weather-rule overlay: which Meta objects have a weather rule (admin-only table)
  const [wxRules, setWxRules] = React.useState([]);
  const [wxControl, setWxControl] = React.useState([]);
  React.useEffect(() => { if (!isAdmin) return; (async () => {
    try {
      const { data:r } = await sb.from('automation_rules').select('*').eq('trigger_type','weather');
      setWxRules((r||[]).map(mapWxRule));
      const { data:ctrl } = await sb.from('automation_control').select('target_id,controlling_rule_id');
      setWxControl(ctrl||[]);
    } catch(_) {}
  })(); }, [isAdmin]);
  const wxRulesFor = c => wxRules.filter(r => [c.campaignId, c.adsetId, c.adId].filter(Boolean).map(String).includes(String(r.targetId)));
  // Distinct regions & cities present in the campaigns
  const campRegions = [...new Set(allMetaCampaigns.map(c => cityToRegion(c.city) || c.city).filter(Boolean))].sort();
  const campCities  = [...new Set(allMetaCampaigns.map(c => c.city).filter(Boolean))].sort();
  const campaigns = allMetaCampaigns
    .filter(c => {
      if (campFilter === 'all') return true;
      if (campFilter.startsWith('city:')) return c.city === campFilter.slice(5);
      return (cityToRegion(c.city) || c.city) === campFilter; // region match
    })
    .sort((a,b) => {
      if (campSort === 'spend') return (b.spend||0) - (a.spend||0);
      if (campSort === 'city')  return String(a.city||'').localeCompare(String(b.city||''));
      return new Date(b.createdAt||0) - new Date(a.createdAt||0); // newest
    });
  const spotifyCampaigns = visibleCampaigns.filter(c => c.platform === 'spotify');
  const [spotifyRefreshing, setSpotifyRefreshing] = React.useState(false);
  const [spotifyError, setSpotifyError] = React.useState(null);

  async function refreshSpotify() {
    if (!spotifyCampaigns.length) return;
    setSpotifyRefreshing(true); setSpotifyError(null);
    try {
      const adAccountId = localStorage.getItem('spotify_ad_account_id') || '';
      if (!adAccountId) throw new Error('No Spotify ad account connected yet — push a campaign from the Digital Ad Planner first');
      const { data: res, error: fnErr } = await sb.functions.invoke('spotify-ads', { body: {
        action: 'report', adAccountId,
        campaignIds: spotifyCampaigns.map(c => c.campaignId),
      }});
      if (fnErr || res?.error) throw new Error(res?.error || fnErr.message);
      for (const row of (res.rows || [])) {
        const match = spotifyCampaigns.find(c => c.campaignId === row.campaignId);
        if (!match) continue;
        await dbUpdateCampaignMetrics(dispatch, match.id, {
          spend: row.spend, impressions: row.impressions, clicks: row.clicks,
          reach: row.reach, ctr: row.ctr,
          cpc: row.clicks > 0 ? row.spend / row.clicks : 0,
          cpm: row.impressions > 0 ? (row.spend / row.impressions) * 1000 : 0,
          status: row.status || 'PAUSED',
        });
      }
    } catch(e) { setSpotifyError(String(e.message || e)); }
    finally { setSpotifyRefreshing(false); }
  }
  const [datePreset, setDatePreset] = useState('last_30d');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [didAutoRefresh, setDidAutoRefresh] = useState(false);
  const [liveStatus, setLiveStatus] = useState({});     // campaignId -> effective_status, polled live
  const [creativeCache, setCreativeCache] = useState({}); // { [adId]: { thumbnail, headline, body, loading, error } }
  const [expandedCreative, setExpandedCreative] = useState({}); // { [campaignId]: bool }
  const [showComments, setShowComments] = useState({}); // { [campaignId]: bool }

  const token = localStorage.getItem('meta_access_token') || '';
  const BASE = 'https://graph.facebook.com/v25.0';

  // Parse Meta insights `actions` into engagement counts.
  // post_reaction = reactions/likes, comment = comments, post = shares of the post.
  function parseEngagement(actions) {
    const acts = Array.isArray(actions) ? actions : [];
    const v = t => { const a = acts.find(x=>x.action_type===t); return a ? parseInt(a.value||0) : 0; };
    return { reactions: v('post_reaction'), comments: v('comment'), shares: v('post') };
  }

  async function fetchCampaignMetrics(c) {
    const [statusRes, insRes] = await Promise.all([
      fetch(`${BASE}/${c.campaignId}?fields=name,status,effective_status,start_time,stop_time&access_token=${token}`),
      fetch(`${BASE}/${c.campaignId}/insights?fields=spend,impressions,clicks,reach,cpc,cpm,ctr,actions&date_preset=${datePreset}&access_token=${token}`),
    ]);
    const statusData = await statusRes.json();
    const insData    = await insRes.json();
    if (statusData.error) throw new Error(statusData.error.message);
    if (insData.error)    throw new Error(insData.error.message);
    const ins = insData.data?.[0] || {};
    const status = statusData.effective_status || statusData.status || c.status;
    const eng = parseEngagement(ins.actions);
    return {
      status,
      stopTime:    statusData.stop_time  || null,
      startTime:   statusData.start_time || null,
      spend:       parseFloat(ins.spend       || 0),
      impressions: parseInt(ins.impressions   || 0),
      clicks:      parseInt(ins.clicks        || 0),
      reach:       parseInt(ins.reach         || 0),
      cpc:         parseFloat(ins.cpc         || 0),
      cpm:         parseFloat(ins.cpm         || 0),
      ctr:         parseFloat(ins.ctr         || 0),
      reactions:   eng.reactions,
      comments:    eng.comments,
      shares:      eng.shares,
    };
  }

  async function fetchCreative(adId) {
    if (!adId || !token) return;
    setCreativeCache(prev => ({ ...prev, [adId]: { ...prev[adId], loading: true, error: null } }));
    try {
      const res = await fetch(
        `${BASE}/${adId}?fields=creative{thumbnail_url,image_url,body,title,name}&access_token=${token}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const cr = json.creative || {};
      setCreativeCache(prev => ({
        ...prev,
        [adId]: {
          loading: false,
          error: null,
          thumbnail: cr.thumbnail_url || cr.image_url || null,
          headline:  cr.title || cr.name || null,
          body:      cr.body  || null,
        }
      }));
    } catch(e) {
      setCreativeCache(prev => ({ ...prev, [adId]: { loading: false, error: String(e.message||e).slice(0,100) } }));
    }
  }

  async function refreshOne(c) {
    if (!token) { showToast(dispatch, 'No Meta token — paste your token in Digital Ad Planner first', 'error'); return; }
    setRefreshingId(c.id);
    try {
      const [metrics] = await Promise.all([
        fetchCampaignMetrics(c),
        c.adId ? fetchCreative(c.adId) : Promise.resolve(),
      ]);
      await dbUpdateCampaignMetrics(dispatch, c.id, metrics);
      showToast(dispatch, `Status: ${metrics.status}`);
    } catch(e) {
      showToast(dispatch, 'Meta error: ' + String(e.message||e).slice(0,140), 'error');
    } finally {
      setRefreshingId(null);
    }
  }

  async function refreshAll() {
    if (!token) { showToast(dispatch, 'No Meta token — paste your token in Digital Ad Planner first', 'error'); return; }
    if (!campaigns.length) return;
    setRefreshing(true);
    let ok = 0; let firstErr = null;
    for (const c of campaigns) {
      try {
        const metrics = await fetchCampaignMetrics(c);
        await dbUpdateCampaignMetrics(dispatch, c.id, metrics);
        ok++;
      } catch(e) {
        if (!firstErr) firstErr = e.message || String(e);
        console.warn('[Insights]', c.campaignId, e);
      }
      await new Promise(r=>setTimeout(r, 250)); // pace calls to avoid Meta rate limit
    }
    setRefreshing(false);
    if (firstErr && ok === 0) {
      showToast(dispatch, 'Meta error: ' + firstErr.slice(0,140), 'error');
    } else {
      showToast(dispatch, `✅ Refreshed ${ok} of ${campaigns.length}${firstErr ? ` (${campaigns.length-ok} failed: ${firstErr.slice(0,60)})` : ''}`);
    }
  }

  // Debug: fetch raw Meta response for one campaign
  const [debugData, setDebugData] = useState(null);
  async function debugOne(c) {
    if (!token) { showToast(dispatch, 'No token set', 'error'); return; }
    try {
      const res = await fetch(`${BASE}/${c.campaignId}?fields=name,status,effective_status,configured_status&access_token=${token}`);
      const json = await res.json();
      setDebugData({ campaignId: c.campaignId, city: c.city, raw: json });
    } catch(e) { setDebugData({ error: String(e) }); }
  }

  // ── Ad set variants (A/B testing) ────────────────────────────────────────
  const ACT = 'act_813974741538881';
  const isRadioFmtAP = f => f === 'radio_15' || f === 'radio_30';
  const [adSets, setAdSets] = useState({});          // { [campaignId]: [{id,name,status,spend,clicks,ctr}] }
  const [adSetsLoading, setAdSetsLoading] = useState({});
  const [showVariants, setShowVariants] = useState({});
  const [variantPicker, setVariantPicker] = useState(null); // campaignId currently choosing a creative
  const [variantBusy, setVariantBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState({});
  const [variantModal, setVariantModal] = useState(null); // campaign object shown in the manage popup
  const [analyzeCampaign, setAnalyzeCampaign] = useState(null); // campaign for AI analysis panel
  function openVariantModal(c) {
    setVariantModal(c);
    setVariantPicker(null);
    if (!adSets[c.id]) loadAdSets(c);
  }
  const blankVariant = { primaryText:'', headline:'', cta:'LEARN_MORE', imgs:{} };
  const [variantForm, setVariantForm] = useState(blankVariant);
  const [variantCampaign, setVariantCampaign] = useState('all'); // creative-library campaign filter
  const variantGroups = [...new Set((state.adCreatives||[]).map(x=>x.group).filter(Boolean))].sort();
  const VARIANT_FORMATS = [
    { fk:'feed_square',   label:'Feed Square',     size:'1:1' },
    { fk:'feed_portrait', label:'Feed Portrait',   size:'4:5' },
    { fk:'stories_reels', label:'Stories / Reels', size:'9:16' },
    { fk:'right_column',  label:'Right Column',    size:'1.91:1' },
  ];
  function openVariantPicker(cid) { setVariantForm(blankVariant); setVariantCampaign('all'); setVariantPicker(cid); }
  function setVariantImg(fk, url) {
    setVariantForm(f => ({ ...f, imgs: { ...f.imgs, [fk]: f.imgs[fk] === url ? undefined : url } }));
  }
  // Fetch a public image URL and upload it to Meta's ad image library → returns a hash
  async function uploadAdImage(url) {
    const blob = await (await fetch(url)).blob();
    const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    const data = await metaPost(`${ACT}/adimages`, { bytes: b64 });
    const first = Object.values(data.images || {})[0];
    if (!first?.hash) throw new Error('Image upload to Meta failed');
    return first.hash;
  }

  const sleep = ms => new Promise(r=>setTimeout(r, ms));
  const isRateLimit = err => /too many calls|rate limit|request limit|#17|#613|#4\b/i.test(String(err));
  async function metaGet(path, tries = 3) {
    for (let i = 0; i < tries; i++) {
      const r = await fetch(`${BASE}/${path}${path.includes('?')?'&':'?'}access_token=${token}`);
      const j = await r.json();
      if (!j.error) return j;
      const msg = j.error.error_user_msg || j.error.message;
      if (isRateLimit(msg) && i < tries-1) { await sleep(1500 * (i+1)); continue; }
      throw new Error(msg);
    }
  }
  async function metaPost(path, body, tries = 3) {
    const form = new URLSearchParams({ ...body, access_token: token });
    for (let i = 0; i < tries; i++) {
      const r = await fetch(`${BASE}/${path}`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: form.toString() });
      const j = await r.json();
      if (!j.error) return j;
      const msg = j.error.error_user_msg || j.error.message;
      if (isRateLimit(msg) && i < tries-1) { await sleep(1500 * (i+1)); continue; }
      throw new Error(msg);
    }
  }

  async function loadAdSets(c) {
    if (!token) { showToast(dispatch, 'No Meta token', 'error'); return; }
    setAdSetsLoading(s=>({...s,[c.id]:true}));
    try {
      const res = await metaGet(`${c.campaignId}/adsets?fields=name,effective_status,status,daily_budget`);
      const rows = res.data || [];
      // Show the list immediately (no metrics), then fill insights one at a time
      const base = rows.map(a => ({ id:a.id, name:a.name, status:a.effective_status||a.status, dailyBudget:a.daily_budget?parseInt(a.daily_budget)/100:null, spend:0, clicks:0, ctr:0, impressions:0 }));
      setAdSets(s=>({...s,[c.id]:base}));
      setShowVariants(s=>({...s,[c.id]:true}));
      // Fetch insights sequentially to stay under Meta's rate limit
      for (const a of base) {
        try {
          const ins = await metaGet(`${a.id}/insights?fields=spend,impressions,clicks,ctr&date_preset=${datePreset}`);
          const d = ins.data?.[0] || {};
          const metrics = { spend:parseFloat(d.spend||0), clicks:parseInt(d.clicks||0), ctr:parseFloat(d.ctr||0), impressions:parseInt(d.impressions||0) };
          setAdSets(s=>({...s,[c.id]: (s[c.id]||[]).map(x=>x.id===a.id?{...x,...metrics}:x)}));
        } catch(_) {}
        await sleep(200);
      }
    } catch(e) { showToast(dispatch, 'Load failed: '+e.message, 'error'); }
    finally { setAdSetsLoading(s=>({...s,[c.id]:false})); }
  }

  // Master ON/OFF — activate/pause the whole hierarchy (campaign + ad sets + ads)
  const [campToggleBusy, setCampToggleBusy] = useState({});
  async function toggleCampaign(c) {
    const isOn = (liveStatus[c.id] || c.status) === 'ACTIVE';
    const goingLive = !isOn;
    if (goingLive) {
      if (!confirm(`Turn ON the "${c.city}" campaign? All its ad sets and ads will go ACTIVE and start spending their daily budgets.`)) return;
    } else {
      if (!confirm(`Turn OFF the "${c.city}" campaign? All delivery pauses immediately.`)) return;
    }
    setCampToggleBusy(s=>({...s,[c.id]:true}));
    const target = goingLive ? 'ACTIVE' : 'PAUSED';
    try {
      // 1. Campaign
      await metaPost(c.campaignId, { status: target });
      // 2. All ad sets + their ads
      const sets = await metaGet(`${c.campaignId}/adsets?fields=id`);
      for (const s of (sets.data||[])) {
        try { await metaPost(s.id, { status: target }); } catch(_) {}
        try {
          const ads = await metaGet(`${s.id}/ads?fields=id`);
          for (const a of (ads.data||[])) { try { await metaPost(a.id, { status: target }); } catch(_) {} }
        } catch(_) {}
      }
      await dbUpdateCampaignMetrics(dispatch, c.id, { ...c, status: target });
      showToast(dispatch, `${c.city} campaign turned ${goingLive ? 'ON — now live' : 'OFF — paused'}`);
      // Refresh ad-set list if the manage modal is open for this campaign
      if (adSets[c.id]) loadAdSets(c);
    } catch(e) { showToast(dispatch, 'Toggle failed: ' + e.message, 'error'); }
    finally { setCampToggleBusy(s=>({...s,[c.id]:false})); }
  }

  async function toggleAdSet(c, adset) {
    const goingLive = adset.status !== 'ACTIVE';
    if (goingLive && !confirm(`Turn ON "${adset.name}"? This ad set will start spending its daily budget.`)) return;
    setToggleBusy(s=>({...s,[adset.id]:true}));
    try {
      await metaPost(adset.id, { status: goingLive ? 'ACTIVE' : 'PAUSED' });
      setAdSets(s=>({...s,[c.id]: s[c.id].map(a=>a.id===adset.id?{...a,status:goingLive?'ACTIVE':'PAUSED'}:a)}));
      showToast(dispatch, `${adset.name} turned ${goingLive?'ON':'OFF'}`);
    } catch(e) { showToast(dispatch, 'Toggle failed: '+e.message, 'error'); }
    finally { setToggleBusy(s=>({...s,[adset.id]:false})); }
  }

  // Create a new ad set (variant) in an existing campaign, using the variant form
  // (up to 4 placement sizes + custom primary text / headline).
  async function addVariant(c) {
    const chosen = VARIANT_FORMATS.map(f => variantForm.imgs[f.fk]).filter(Boolean);
    if (chosen.length === 0) { showToast(dispatch, 'Pick at least one image size', 'error'); return; }
    if (!variantForm.primaryText.trim()) { showToast(dispatch, 'Add some primary text', 'error'); return; }
    setVariantBusy(true);
    try {
      const pageId  = localStorage.getItem('meta_page_id') || '';
      const website = localStorage.getItem('meta_website_url') || 'https://suenos.ca';
      if (!pageId) throw new Error('No Facebook Page ID saved — set it in Settings → API Credentials');

      // 1. Copy targeting/settings from the campaign's first ad set
      const src = await metaGet(`${c.adsetId}?fields=targeting,billing_event,optimization_goal,bid_strategy,daily_budget`);
      const variantNum = (adSets[c.id]?.length || 1) + 1;

      // Multiple distinct images → we'll build a Dynamic Creative (asset_feed_spec),
      // which Meta only allows inside an ad set flagged is_dynamic_creative.
      const uniqueUrls = [...new Set(chosen)];
      const isDynamic = uniqueUrls.length > 1;

      // 2. New ad set (PAUSED)
      const newAdSet = await metaPost(`${ACT}/adsets`, {
        name: `${c.city} - Variant ${variantNum}`,
        campaign_id: c.campaignId,
        daily_budget: src.daily_budget || '2000',
        billing_event: src.billing_event || 'IMPRESSIONS',
        optimization_goal: src.optimization_goal || 'LINK_CLICKS',
        bid_strategy: src.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
        status: 'PAUSED',
        ...(isDynamic ? { is_dynamic_creative: true } : {}),
        targeting: JSON.stringify(src.targeting || {}),
      });

      // 3. Upload each chosen image → Meta hash
      const hashes = [];
      for (const u of uniqueUrls) hashes.push(await uploadAdImage(u));

      // 4. Creative — single image if one, asset_feed_spec (multi-placement) if several
      let creativeBody;
      if (hashes.length === 1) {
        creativeBody = {
          name: `${c.city} Variant ${variantNum} Creative`,
          object_story_spec: JSON.stringify({
            page_id: pageId,
            link_data: {
              message: variantForm.primaryText,
              link: website,
              name: variantForm.headline || 'Sueños Tequila',
              image_hash: hashes[0],
              call_to_action: { type: variantForm.cta, value: { link: website } },
            },
          }),
        };
      } else {
        creativeBody = {
          name: `${c.city} Variant ${variantNum} Creative`,
          object_story_spec: JSON.stringify({ page_id: pageId }),
          asset_feed_spec: JSON.stringify({
            images: hashes.map(h => ({ hash: h })),
            bodies: [{ text: variantForm.primaryText }],
            titles: [{ text: variantForm.headline || 'Sueños Tequila' }],
            link_urls: [{ website_url: website }],
            call_to_action_types: [variantForm.cta],
            ad_formats: ['SINGLE_IMAGE'],
          }),
        };
      }
      const cre = await metaPost(`${ACT}/adcreatives`, creativeBody);

      // 5. New ad (PAUSED)
      await metaPost(`${ACT}/ads`, {
        name: `${c.city} - Variant ${variantNum}`,
        adset_id: newAdSet.id,
        creative: JSON.stringify({ creative_id: cre.id }),
        status: 'PAUSED',
      });

      showToast(dispatch, `✅ Variant ${variantNum} created (paused) — toggle it on when ready`);
      setVariantPicker(null);
      await loadAdSets(c);
    } catch(e) { showToast(dispatch, 'Create variant failed: '+e.message, 'error'); }
    finally { setVariantBusy(false); }
  }

  // Auto-refresh on first load and when date preset changes
  useEffect(() => {
    if (token && campaigns.length > 0) {
      refreshAll();
    }
    setDidAutoRefresh(true);
  }, [datePreset]);

  // Keep on/off status live: poll each campaign's effective status every 45s
  // (lightweight status-only fetch — no insights) so the header reflects reality
  // even when a weather rule flips a campaign while you're watching.
  const campIdsKey = campaigns.map(c=>c.id).join(',');
  useEffect(() => {
    if (!token || campaigns.length === 0) return;
    let dead = false;
    const pull = async () => {
      for (const c of campaigns) {
        try {
          const j = await fetch(`${BASE}/${c.campaignId}?fields=effective_status,status&access_token=${token}`).then(r=>r.json());
          if (!dead && !j.error) setLiveStatus(s => ({ ...s, [c.id]: j.effective_status || j.status }));
        } catch(_) {}
        await new Promise(r=>setTimeout(r,120));
      }
    };
    const t = setInterval(pull, 45000);
    return () => { dead = true; clearInterval(t); };
  }, [token, campIdsKey]);
  const effStatusOf = c => liveStatus[c.id] || c.status;

  const fmtMoney = n => n === 0 ? '$0.00' : `$${n.toFixed(2)}`;
  const fmtPct   = n => n === 0 ? '0.00%' : `${n.toFixed(2)}%`;
  const fmtNum   = n => n === 0 ? '—' : n.toLocaleString();
  const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-CA', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : null;

  const statusChip = (s) => {
    const map = {
      ACTIVE:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      PAUSED:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      DELETED:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${map[s]||map.PAUSED}`}>{s||'PAUSED'}</span>;
  };

  // Delivery badge: Running / Scheduled / Completed / Paused
  const deliveryChip = (c) => {
    const now  = new Date();
    const s    = (c.status || '').toUpperCase();
    const stop = c.stopTime  ? new Date(c.stopTime)  : null;
    const start= c.startTime ? new Date(c.startTime) : null;
    let label, cls;
    if (s === 'COMPLETED' || (stop && stop < now)) {
      label = 'Completed'; cls = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    } else if (s === 'ACTIVE' && start && start > now) {
      label = 'Scheduled'; cls = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    } else if (s === 'ACTIVE') {
      label = 'Running';   cls = 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    } else if (s === 'PAUSED') {
      label = 'Paused';    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    } else {
      return null;
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>{label}</span>;
  };

  const totalSpend       = campaigns.reduce((s,c)=>s+c.spend,0);
  const totalImpressions = campaigns.reduce((s,c)=>s+c.impressions,0);
  const totalClicks      = campaigns.reduce((s,c)=>s+c.clicks,0);
  const totalReach       = campaigns.reduce((s,c)=>s+c.reach,0);
  const avgCtr           = totalImpressions > 0 ? (totalClicks/totalImpressions)*100 : 0;

  // Export the page as PDF via the browser's print-to-PDF (vector output, no libraries)
  function exportPdf() {
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');
    document.body.classList.add('print-adperf');
    const cleanup = () => {
      document.body.classList.remove('print-adperf');
      if (wasDark) document.documentElement.classList.add('dark');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 100);
  }

  // ── Marketing alerts (declining ad performance) ────────────────────────────
  const MKT_ALERT_LABELS = { ctr_drop:'CTR dropping', cost_rise:'Cost rising', spend_up_clicks_down:'Spend up, clicks down', ai_score_drop:'AI score dropped' };
  const activeAlerts = (state.marketingAlerts||[]).filter(a => a.status !== 'resolved');
  const alertByCampaign = {}; activeAlerts.forEach(a => { alertByCampaign[a.campaignId] = a; });
  const mktIsAdmin = state.user?.role === 'admin';
  const myAlertsOn = state.user ? (state.users||[]).find(u=>u.id===state.user.id)?.marketingAlertsEnabled !== false : true;
  async function ackAlert(a, status) { try { await dbUpdateAlertStatus(dispatch, a.id, status, state.user?.id); showToast(dispatch, status==='resolved'?'Alert resolved':'Alert acknowledged'); } catch(e){ showToast(dispatch,'Update failed','error'); } }
  async function toggleMyAlerts() { if(!state.user) return; try { await dbSetMarketingAlertsEnabled(dispatch, state.user.id, !myAlertsOn); showToast(dispatch, !myAlertsOn?'Marketing alert emails on':'Marketing alert emails off'); } catch(e){ showToast(dispatch,'Update failed','error'); } }

  return (
    <div id="ad-performance-print" className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto">
      {/* Header hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2E8A97] to-[#3c9ca8] p-5 sm:p-6 mb-5 text-white shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight">Ad Performance</h2>
          <p className="text-xs text-teal-100/70 mt-0.5">
            {campaigns.length} campaign{campaigns.length!==1?'s':''} tracked
            {(()=>{ const spent=(state.adAnalyses||[]).reduce((s,a)=>s+(a.costUsd||0),0); return spent>0 ? ` · ${(state.adAnalyses||[]).length} AI analyses · $${spent.toFixed(2)} spent` : ''; })()}
            <span className="hidden print:inline"> · Sueños Tequila · exported {new Date().toLocaleDateString('en-CA')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap no-print">
          <select value={datePreset} onChange={e=>setDatePreset(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-gray-800">
            <option value="last_7d">Last 7 days</option>
            <option value="last_14d">Last 14 days</option>
            <option value="last_30d">Last 30 days</option>
            <option value="last_90d">Last 90 days</option>
            <option value="lifetime">Lifetime</option>
          </select>
          <button onClick={refreshAll} disabled={refreshing || !campaigns.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-[#2E8A97] hover:bg-teal-50 disabled:opacity-50 transition-colors">
            {refreshing
              ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-[#2E8A97] border-t-transparent rounded-full"></span> Refreshing…</>
              : '↻ Refresh All'}
          </button>
          <button onClick={exportPdf} disabled={!campaigns.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 disabled:opacity-50 transition-colors">
            ⬇ Export PDF
          </button>
          {mktIsAdmin && (
            <button onClick={toggleMyAlerts} title={myAlertsOn?'Marketing alert emails ON — click to mute':'Marketing alert emails OFF — click to enable'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${myAlertsOn?'bg-white/10 border-white/20 text-white hover:bg-white/20':'bg-transparent border-white/20 text-teal-100/60 hover:bg-white/10'}`}>
              {myAlertsOn ? '🔔' : '🔕'} Alerts
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Declining-ad performance alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 overflow-hidden no-print">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/70 dark:border-amber-900/40">
            <span className="text-base">⚠️</span>
            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{activeAlerts.length} ad{activeAlerts.length!==1?'s':''} with declining performance</span>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {activeAlerts.map(a => {
              const d = a.details || {};
              const bits = [];
              if (d.ctr_change_pct!=null) bits.push(`CTR ${d.ctr_change_pct}%`);
              if (d.cpc_change_pct!=null) bits.push(`CPC ${d.cpc_change_pct>0?'+':''}${d.cpc_change_pct}%`);
              if (d.spend_change_pct!=null) bits.push(`spend +${d.spend_change_pct}%, clicks ${d.clicks_change_pct}%`);
              if (d.ai_score!=null) bits.push(`AI score ${d.ai_score}`);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{a.city || 'Campaign'}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.severity==='critical'?'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300':'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{a.severity}</span>
                      {(a.alertTypes||[]).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300">{MKT_ALERT_LABELS[t]||t}</span>)}
                      {a.status==='acknowledged' && <span className="text-[10px] text-gray-400">· acknowledged</span>}
                    </div>
                    {bits.length>0 && <p className="text-xs text-gray-500 mt-0.5">{bits.join(' · ')}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {a.status==='new' && <button onClick={()=>ackAlert(a,'acknowledged')} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800">Acknowledge</button>}
                    <button onClick={()=>ackAlert(a,'resolved')} className="text-xs px-2.5 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700">Resolve</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter + sort toolbar */}
      {allMetaCampaigns.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4 no-print bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-3 py-2 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          <select value={campFilter} onChange={e=>setCampFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="all">All campaigns ({allMetaCampaigns.length})</option>
            {campRegions.length > 0 && <optgroup label="By region">
              {campRegions.map(r=><option key={r} value={r}>{r}</option>)}
            </optgroup>}
            {campCities.length > 0 && <optgroup label="By city / account cluster">
              {campCities.map(ci=><option key={ci} value={`city:${ci}`}>{ci}</option>)}
            </optgroup>}
          </select>
          <span className="text-xs text-gray-500 font-medium ml-1">Sort:</span>
          <select value={campSort} onChange={e=>setCampSort(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="newest">Newest first</option>
            <option value="spend">Most spend</option>
            <option value="city">City A–Z</option>
          </select>
          {campFilter !== 'all' && (
            <span className="text-[11px] text-gray-400">{campaigns.length} shown</span>
          )}
        </div>
      )}

      {/* Summary bar */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label:'Total Spend',       value: fmtMoney(totalSpend),       icon:'💰', accent:'#6366f1' },
            { label:'Total Impressions', value: fmtNum(totalImpressions),   icon:'👁', accent:'#0ea5e9' },
            { label:'Total Clicks',      value: fmtNum(totalClicks),        icon:'🖱', accent:'#10b981' },
            { label:'Avg CTR',           value: fmtPct(avgCtr),             icon:'🎯', accent:'#f59e0b' },
          ].map(s=>(
            <div key={s.label} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{background:s.accent}}/>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{s.icon}</span>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{s.label}</p>
              </div>
              <p className="text-2xl font-black" style={{color:s.accent}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campaign cards */}
      {campaigns.length === 0 && allMetaCampaigns.length > 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No campaigns match this filter.</p>
          <button onClick={()=>setCampFilter('all')} className="mt-2 text-xs text-teal-600 hover:underline">Clear filter</button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">No campaigns yet</p>
          <p className="text-sm text-gray-500">Create one in Digital Ad Planner → Push to Meta</p>
          <button onClick={()=>dispatch({type:'NAV',view:'cluster-ads'})}
            className="mt-4 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors">
            Go to Digital Ad Planner
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => { const eff = effStatusOf(c); const running = eff === 'ACTIVE'; const busy = campToggleBusy[c.id]; const alert = alertByCampaign[c.id]; return (
            <div key={c.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${running?'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400':'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                    {running ? <IcoPlay className="w-5 h-5"/> : <IcoPause className="w-5 h-5"/>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-gray-900 dark:text-white truncate">{c.city}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${running?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300':'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>{running?'Running':(eff||'Paused').replace(/_/g,' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase())}</span>
                      {alert && <span title={(alert.alertTypes||[]).map(t=>MKT_ALERT_LABELS[t]||t).join(', ')} className={`w-2.5 h-2.5 rounded-full ${alert.severity==='critical'?'bg-red-500':'bg-amber-500'}`}/>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {running ? 'Delivering' : 'Paused — not delivering'}
                      {c.lastRefreshedAt && <span> · updated {fmtDate(c.lastRefreshedAt)}</span>}
                    </p>
                    {isAdmin && wxRulesFor(c).length>0 && <AdWeatherRuleTag rules={wxRulesFor(c)} control={wxControl} />}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 no-print">
                  <button onClick={()=>toggleCampaign(c)} disabled={busy || !token}
                    title={running?'Turn campaign OFF':'Turn campaign ON'}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${running?'bg-emerald-500':'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className="inline-block rounded-full bg-white shadow transition-transform" style={{height:'22px',width:'22px',transform:running?'translateX(23px)':'translateX(3px)'}}/>
                  </button>
                  <button onClick={()=>refreshOne(c)} disabled={refreshingId===c.id} title="Refresh metrics"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                    {refreshingId===c.id ? <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"/> : <IcoRefresh className="w-4 h-4"/>}
                  </button>
                  <a href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=813974741538881&selected_campaign_ids=${c.campaignId}`} target="_blank" rel="noopener noreferrer" title="Open in Ads Manager"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <IcoExternal className="w-4 h-4"/>
                  </a>
                </div>
              </div>
              {/* Metrics grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label:'Spend',   value: fmtMoney(c.spend) },
                  { label:'Reach',   value: fmtNum(c.reach) },
                  { label:'Impr.',   value: fmtNum(c.impressions) },
                  { label:'Clicks',  value: fmtNum(c.clicks) },
                  { label:'CTR',     value: fmtPct(c.ctr) },
                  { label:'CPC',     value: c.cpc > 0 ? fmtMoney(c.cpc) : '—' },
                ].map(m=>(
                  <div key={m.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-2 py-2 text-center">
                    <p className="text-sm font-black text-gray-900 dark:text-white">{m.value}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              {/* Engagement — icons, not emoji */}
              <div className="flex items-center gap-5 mt-2 px-1 text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 text-xs" title="Reactions"><IcoHeart className="w-4 h-4 text-rose-500"/> <b className="text-gray-800 dark:text-gray-200">{fmtNum(c.reactions||0)}</b></span>
                <span className="inline-flex items-center gap-1.5 text-xs" title="Comments"><IcoChat className="w-4 h-4 text-sky-500"/> <b className="text-gray-800 dark:text-gray-200">{fmtNum(c.comments||0)}</b></span>
                <span className="inline-flex items-center gap-1.5 text-xs" title="Shares"><IcoShare className="w-4 h-4 text-emerald-500"/> <b className="text-gray-800 dark:text-gray-200">{fmtNum(c.shares||0)}</b></span>
              </div>
              {/* Comments (read + reply) — badge alerts when the ad has comments */}
              {c.adId && (
                <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {c.comments > 0 ? (
                    <button onClick={()=>setShowComments(s=>({...s,[c.id]:!s[c.id]}))}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-full pl-2 pr-3 py-1">
                      <IcoChat className="w-3.5 h-3.5"/> {c.comments} — {showComments[c.id] ? 'hide' : 'reply'}
                    </button>
                  ) : (
                    <button onClick={()=>setShowComments(s=>({...s,[c.id]:!s[c.id]}))}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                      <IcoChat className="w-3.5 h-3.5"/> {showComments[c.id] ? 'Hide comments' : 'Comments'}
                    </button>
                  )}
                  {showComments[c.id] && <AdCommentsPanel adId={c.adId} />}
                </div>
              )}
              {/* Ad Creative Preview */}
              {c.adId && (() => {
                const cr = creativeCache[c.adId];
                const isExpanded = expandedCreative[c.id];
                return (
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ad Creative</span>
                      <div className="flex items-center gap-2">
                        {!cr && (
                          <button onClick={()=>fetchCreative(c.adId)}
                            className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline">
                            Load preview
                          </button>
                        )}
                        {cr && !cr.loading && (
                          <button onClick={()=>setExpandedCreative(prev=>({...prev,[c.id]:!isExpanded}))}
                            className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                        )}
                      </div>
                    </div>
                    {cr?.loading && (
                      <p className="text-[11px] text-gray-400 animate-pulse">Loading creative…</p>
                    )}
                    {cr?.error && (
                      <p className="text-[11px] text-red-400">Could not load: {cr.error}</p>
                    )}
                    {cr && !cr.loading && !cr.error && (
                      <div className={`flex gap-3 ${isExpanded ? '' : 'items-center'}`}>
                        {cr.thumbnail && (
                          <div className={`flex-shrink-0 ${isExpanded ? 'w-40' : 'w-16 h-16'} overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800`}>
                            <img src={cr.thumbnail} alt="Ad creative"
                              className={`object-cover w-full ${isExpanded ? 'h-auto max-h-52' : 'h-16'}`}
                              onError={e=>e.currentTarget.style.display='none'}/>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {cr.headline && (
                            <p className={`font-semibold text-gray-900 dark:text-white ${isExpanded ? 'text-sm' : 'text-[12px] truncate'}`}>
                              {cr.headline}
                            </p>
                          )}
                          {cr.body && (
                            <p className={`text-gray-500 dark:text-gray-400 mt-0.5 ${isExpanded ? 'text-xs whitespace-pre-wrap' : 'text-[11px] line-clamp-2'}`}>
                              {cr.body}
                            </p>
                          )}
                          {!cr.headline && !cr.body && !cr.thumbnail && (
                            <p className="text-[11px] text-gray-400 italic">No creative data returned from Meta</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Action rows — bigger icons, short labels */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 no-print">
                <button onClick={()=>openVariantModal(c)} disabled={!token}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:shadow-sm transition-all disabled:opacity-50 group">
                  <span className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white flex-shrink-0"><IcoLayers className="w-5 h-5"/></span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100 flex-1 text-left">Variants &amp; A/B</span>
                  <span className="text-teal-500 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
                {(()=>{ const saved=(state.adAnalyses||[]).filter(a=>a.campaignId===c.id); return (
                <button onClick={()=>{ if(c.adId && !creativeCache[c.adId]) fetchCreative(c.adId); setAnalyzeCampaign(c); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 hover:border-violet-400 hover:shadow-sm transition-all group">
                  <span className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white flex-shrink-0"><IcoSpark className="w-5 h-5"/></span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100 flex-1 text-left">AI Analysis</span>
                  {saved.length>0 && <span className="text-[10px] font-bold text-violet-600 bg-violet-100 dark:bg-violet-900/40 rounded-full px-2 py-0.5">{saved.length}</span>}
                  <span className="text-violet-500 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
                ); })()}
              </div>
              {/* Footer IDs — click any to copy */}
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-gray-400">
                <span className="cursor-pointer hover:text-teal-600" title="Copy campaign ID" onClick={()=>{navigator.clipboard?.writeText(String(c.campaignId||'')); showToast(dispatch,'Campaign ID copied');}}>Camp {c.campaignId} ⧉</span>
                {c.adsetId && <span className="cursor-pointer hover:text-teal-600" title="Copy ad set ID" onClick={()=>{navigator.clipboard?.writeText(String(c.adsetId)); showToast(dispatch,'Ad set ID copied');}}>Ad set {c.adsetId} ⧉</span>}
                {c.adId && <span className="cursor-pointer hover:text-teal-600" title="Copy ad ID" onClick={()=>{navigator.clipboard?.writeText(String(c.adId)); showToast(dispatch,'Ad ID copied');}}>Ad {c.adId} ⧉</span>}
              </div>
            </div>
          ); })}
        </div>
      )}

      {!token && campaigns.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ No Meta access token found. Open Digital Ad Planner, push a campaign, and the token will be saved automatically.
        </div>
      )}

      {/* ── Manage Variants Modal ─────────────────────────────────────────── */}
      {variantModal && (
        <Modal open={true} onClose={()=>{ setVariantModal(null); setVariantPicker(null); }} title={`⚙ Variants · ${variantModal.city}`}>
          <div className="space-y-4">
            {/* Current ad sets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Sets in this Campaign</p>
                <button onClick={()=>loadAdSets(variantModal)} disabled={adSetsLoading[variantModal.id]}
                  className="text-[11px] text-teal-600 hover:underline disabled:opacity-50">
                  {adSetsLoading[variantModal.id] ? 'Refreshing…' : '↻ Refresh'}
                </button>
              </div>
              {adSetsLoading[variantModal.id] && !adSets[variantModal.id] ? (
                <p className="text-xs text-gray-400 py-3 text-center">Loading ad sets…</p>
              ) : (adSets[variantModal.id]||[]).length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No ad sets found.</p>
              ) : (
                <div className="space-y-2">
                  {(adSets[variantModal.id]||[]).map(a=>{
                    const on = a.status === 'ACTIVE';
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                        <button onClick={()=>toggleAdSet(variantModal, a)} disabled={toggleBusy[a.id]}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${on?'bg-emerald-500':'bg-gray-300 dark:bg-gray-600'} disabled:opacity-50`}>
                          <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${on?'translate-x-5.5':'translate-x-1'}`} style={{height:'18px',width:'18px',transform:on?'translateX(22px)':'translateX(3px)'}}/>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{a.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono cursor-pointer hover:text-teal-600 truncate" title="Click to copy ad set ID" onClick={()=>{navigator.clipboard?.writeText(String(a.id)); showToast(dispatch,'Ad set ID copied');}}>ID {a.id} ⧉</p>
                          <p className="text-[11px] text-gray-400">
                            <span className={on?'text-emerald-600 font-semibold':''}>{on ? '● Running' : (a.status||'Paused')}</span>
                            {a.dailyBudget ? ` · $${a.dailyBudget}/day` : ''}
                            {a.impressions ? ` · ${a.impressions.toLocaleString()} impr · ${a.ctr.toFixed(2)}% CTR · $${a.spend.toFixed(2)} spent` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add new variant */}
            {variantPicker === variantModal.id ? (
              <div className="rounded-xl border border-teal-200 dark:border-teal-700 p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">New Ad Set — Creative &amp; Copy</p>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Primary Text</label>
                  <textarea rows={2} value={variantForm.primaryText} onChange={e=>setVariantForm(f=>({...f,primaryText:e.target.value}))}
                    placeholder="The main ad copy shown above the image…"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Headline</label>
                    <input value={variantForm.headline} onChange={e=>setVariantForm(f=>({...f,headline:e.target.value}))}
                      placeholder="Sueños Tequila"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Button</label>
                    <select value={variantForm.cta} onChange={e=>setVariantForm(f=>({...f,cta:e.target.value}))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="LEARN_MORE">Learn More</option>
                      <option value="SHOP_NOW">Shop Now</option>
                      <option value="GET_DIRECTIONS">Get Directions</option>
                      <option value="CONTACT_US">Contact Us</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase">Images by placement <span className="font-normal normal-case text-gray-400">(pick at least one)</span></label>
                    {variantGroups.length > 0 && (
                      <select value={variantCampaign} onChange={e=>setVariantCampaign(e.target.value)}
                        className="px-2 py-1 text-[10px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
                        <option value="all">📁 All campaigns</option>
                        <option value="ungrouped">Ungrouped</option>
                        {variantGroups.map(g=><option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    {VARIANT_FORMATS.map(fmt=>{
                      const opts = (state.adCreatives||[]).filter(x=>
                        (x.format===fmt.fk || x.format==='other') &&
                        (variantCampaign==='all' || (variantCampaign==='ungrouped' ? !x.group : x.group===variantCampaign)));
                      return (
                        <div key={fmt.fk}>
                          <p className="text-[10px] text-gray-500 mb-0.5">{fmt.label} <span className="text-gray-400">· {fmt.size}</span></p>
                          {opts.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">No {fmt.label} creatives — upload in Ad Creatives</p>
                          ) : (
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                              {opts.map(x=>{
                                const sel = variantForm.imgs[fmt.fk] === x.publicUrl;
                                return (
                                  <button key={x.id} onClick={()=>setVariantImg(fmt.fk, x.publicUrl)}
                                    className={`relative rounded-md overflow-hidden border-2 flex-shrink-0 transition ${sel?'border-teal-500':'border-transparent hover:border-teal-300'}`}>
                                    <img src={x.publicUrl} alt={x.name} className="w-14 h-14 object-cover"/>
                                    {sel && <span className="absolute top-0.5 right-0.5 bg-teal-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Btn size="sm" onClick={()=>addVariant(variantModal)} disabled={variantBusy}>{variantBusy ? 'Creating & sending to Meta…' : '＋ Create & Send to Meta (paused)'}</Btn>
                  <button onClick={()=>setVariantPicker(null)} className="text-[11px] text-gray-400 hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>openVariantPicker(variantModal.id)}
                className="w-full py-2.5 text-xs font-semibold rounded-xl border border-dashed border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition">
                + Add Ad Set (new creative &amp; text)
              </button>
            )}
            <p className="text-[10px] text-gray-400">New ad sets are created <strong>paused</strong> and go through Meta's review. Toggle on to run — each ad set spends its own daily budget.</p>
          </div>
        </Modal>
      )}

      {/* ── AI Analysis panel ─────────────────────────────────────────────── */}
      {analyzeCampaign && (
        <AdAnalysisModal campaign={analyzeCampaign} creative={analyzeCampaign.adId ? creativeCache[analyzeCampaign.adId] : null}
          allCampaigns={campaigns} benchmarks={pmBuildBenchmarks(analyzeCampaign, allMetaCampaigns)}
          onClose={()=>setAnalyzeCampaign(null)}/>
      )}

      {/* ── Spotify Campaigns ─────────────────────────────────────────────── */}
      {spotifyCampaigns.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">🎧 Spotify Campaigns</h2>
              <p className="text-xs text-gray-500 mt-0.5">{spotifyCampaigns.length} audio campaign{spotifyCampaigns.length!==1?'s':''} · lifetime metrics</p>
            </div>
            <button onClick={refreshSpotify} disabled={spotifyRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-black hover:bg-gray-800 text-white disabled:opacity-50 transition-colors">
              {spotifyRefreshing
                ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Refreshing…</>
                : '↻ Refresh Spotify'}
            </button>
          </div>
          {spotifyError && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 mb-3">{spotifyError}</div>
          )}
          <div className="space-y-2">
            {spotifyCampaigns.map(c=>(
              <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs">🎧</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.city} — Radio</p>
                      <p className="text-[10px] text-gray-400">{String(c.createdAt||'').slice(0,10)}{c.lastRefreshedAt ? ` · refreshed ${String(c.lastRefreshedAt).slice(0,10)}` : ' · not refreshed yet'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${c.status==='ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{c.status||'PAUSED'}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-3">
                  {[
                    { l:'Spend',       v: `$${(c.spend||0).toFixed(2)}` },
                    { l:'Impressions', v: fmtNum ? fmtNum(c.impressions||0) : (c.impressions||0) },
                    { l:'Reach',       v: fmtNum ? fmtNum(c.reach||0) : (c.reach||0) },
                    { l:'Clicks',      v: c.clicks||0 },
                    { l:'CTR',         v: `${(c.ctr||0).toFixed(2)}%` },
                    { l:'CPM',         v: `$${(c.cpm||0).toFixed(2)}` },
                  ].map((s,i)=>(
                    <div key={i}>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{s.l}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Email Snapshot (Admin) ─────────────────────────────────────────
const SNAPSHOT_SECTION_DEFS = [
  { key:'mom',          label:'Vs last month (comparison)',   group:'Highlights' },
  { key:'trend',        label:'Sales trend chart',            group:'Highlights' },
  { key:'listed',       label:'Newly listed accounts',        group:'Sections'   },
  { key:'top_accounts', label:'Top accounts',                 group:'Sections'   },
  { key:'menu',         label:'Menu placements',              group:'Sections'   },
  { key:'tastings',     label:'Upcoming tastings',            group:'Sections'   },
  { key:'rep_activity', label:'Rep activity',                 group:'Sections'   },
];
const SNAPSHOT_DEFAULT_SECTIONS = ['mom','trend','listed','top_accounts','menu','tastings','rep_activity'];

function DashboardEmailView() {
  const { state, dispatch } = useApp();
  const raw = state.dashEmailConfig;
  const [form, setForm] = useState(raw
    ? { ...raw, sections: (raw.sections && raw.sections.length) ? raw.sections : SNAPSHOT_DEFAULT_SECTIONS }
    : { emails:[], sendHour:8, sendDays:['monday'], enabled:false, timezone:'America/Vancouver', sections: SNAPSHOT_DEFAULT_SECTIONS });
  const [newEmail, setNewEmail] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { if (raw) setForm({...raw, sections: (raw.sections && raw.sections.length) ? raw.sections : SNAPSHOT_DEFAULT_SECTIONS}); }, [raw]);

  function toggleSection(key) {
    setForm(f => {
      const cur = f.sections || SNAPSHOT_DEFAULT_SECTIONS;
      return { ...f, sections: cur.includes(key) ? cur.filter(x=>x!==key) : [...cur, key] };
    });
  }

  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const HOURS = Array.from({length:24}, (_,i) => {
    const h = i%12||12; const ampm = i<12?'AM':'PM';
    return { value:i, label:`${String(h).padStart(2,' ')}:00 ${ampm}` };
  });
  const TZS = ['America/Vancouver','America/Edmonton','America/Winnipeg','America/Toronto','America/Halifax'];

  function addEmail() {
    const e = newEmail.trim().toLowerCase();
    if (!e || !e.includes('@') || form.emails.includes(e)) return;
    setForm(f=>({...f, emails:[...f.emails, e]}));
    setNewEmail('');
  }
  function removeEmail(e) { setForm(f=>({...f, emails:f.emails.filter(x=>x!==e)})); }
  function toggleDay(d) {
    setForm(f=>({...f, sendDays: f.sendDays.includes(d) ? f.sendDays.filter(x=>x!==d) : [...f.sendDays, d]}));
  }

  async function save() {
    setSaving(true);
    try { await dbSaveDashEmailConfig(dispatch, form); showToast(dispatch,'✅ Saved'); }
    catch(e) { showToast(dispatch,'Save failed: '+e.message,'error'); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    if (!form.emails.length) { showToast(dispatch,'Add at least one recipient first','error'); return; }
    setTesting(true);
    try {
      const { error } = await sb.functions.invoke('send-dashboard-snapshot', { body: { force: true } });
      if (error) throw error;
      showToast(dispatch,'✅ Test snapshot sent!');
    } catch(e) { showToast(dispatch,'Send failed: '+String(e.message||e).slice(0,120),'error'); }
    finally { setTesting(false); }
  }

  const dayLabel = d => d.charAt(0).toUpperCase() + d.slice(1,3);
  const lastSent = form.lastSentAt
    ? new Date(form.lastSentAt).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white text-sm">📧</div>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Dashboard Email Snapshot</h1>
          <p className="text-xs text-gray-400">Send a metrics digest to your team on a recurring schedule.</p>
        </div>
      </div>

      {/* Setup notice */}
      <Card cls="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">⚙️ One-time setup required</p>
        <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
          Make sure <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded mx-1">RESEND_API_KEY</code> is set in
          Supabase → Edge Functions → Manage Secrets, then run <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded mx-1">dashboard-email.sql</code> and
          deploy the <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded mx-1">send-dashboard-snapshot</code> edge function.
        </p>
      </Card>

      {/* Enable toggle */}
      <Card cls="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Enable scheduled emails</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.enabled
                ? lastSent ? `Last sent ${lastSent}` : 'Enabled — no sends yet'
                : 'Emails are currently paused'}
            </p>
          </div>
          <button onClick={()=>setForm(f=>({...f,enabled:!f.enabled}))}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.enabled?'bg-teal-600':'bg-gray-200 dark:bg-gray-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enabled?'translate-x-5':''}`}/>
          </button>
        </div>
      </Card>

      {/* Recipients */}
      <Card cls="p-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Recipients</p>
        <div className="flex gap-2 mb-3">
          <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&addEmail()}
            placeholder="email@example.com"
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"/>
          <button onClick={addEmail}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors">
            Add
          </button>
        </div>
        {form.emails.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No recipients yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {form.emails.map(e=>(
              <span key={e} className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg text-xs font-medium">
                {e}
                <button onClick={()=>removeEmail(e)} className="text-teal-400 hover:text-red-500 transition-colors text-base leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Schedule */}
      <Card cls="p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Schedule</p>

        {/* Days */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Send on</p>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(d=>(
              <button key={d} onClick={()=>toggleDay(d)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                  form.sendDays.includes(d)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-teal-400'}`}>
                {dayLabel(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Hour + Timezone */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-32">
            <p className="text-xs text-gray-500 mb-1.5">At (local time)</p>
            <select value={form.sendHour} onChange={e=>setForm(f=>({...f,sendHour:parseInt(e.target.value)}))}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {HOURS.map(h=><option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <p className="text-xs text-gray-500 mb-1.5">Timezone</p>
            <select value={form.timezone} onChange={e=>setForm(f=>({...f,timezone:e.target.value}))}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {TZS.map(tz=><option key={tz} value={tz}>{tz.replace('America/','')}</option>)}
            </select>
          </div>
        </div>

        {form.sendDays.length > 0 && (
          <p className="text-xs text-gray-400">
            Will send every {form.sendDays.map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(', ')} at {HOURS[form.sendHour]?.label} {form.timezone.replace('America/','')}
          </p>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        <button onClick={sendTest} disabled={testing}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50 transition-colors">
          {testing ? 'Sending…' : '📤 Send Test Now'}
        </button>
      </div>

      {/* What's included — pick the pieces */}
      <Card cls="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">What's in the snapshot</p>
          <span className="text-[11px] text-gray-400">{(form.sections||[]).length} selected</span>
        </div>
        {['Highlights','Sections'].map(group => (
          <div key={group} className="mb-3 last:mb-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {SNAPSHOT_SECTION_DEFS.filter(s=>s.group===group).map(s => {
                const on = (form.sections||[]).includes(s.key);
                return (
                  <label key={s.key} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer py-0.5">
                    <input type="checkbox" checked={on} onChange={()=>toggleSection(s.key)}
                      className="rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500" />
                    {s.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-gray-400 mt-2">Checked pieces are included in the email. The header and the orders / bottles / revenue summary are always shown. Remember to Save.</p>
      </Card>
    </div>
  );
}

// ── BC Liquor Licence Upload (Admin) ─────────────────────────────────────────
function LicensesAdminView() {
  const { state, dispatch } = useApp();
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null); // { rows, total, parsed }
  const [parsing, setParsing]   = useState(false);
  const [upserting, setUpserting] = useState(false);
  const [upsertResult, setUpsertResult] = useState(null);
  const [upsertError, setUpsertError]   = useState(null);
  const [typeFilter, setTypeFilter] = useState({
    'Food Primary':true, 'Liquor Primary':true, 'Liquor Primary Club':true,
    'Licensee Retail Store':true, 'Rural Licensee Retail Store':true,
    'Wine Store':true, 'Manufacturer':false, 'Catering':false,
  });

  const XLSX_COLS = {
    licenceNumber:3, licenceType:4, establishment:6,
    address:7, city:8, postalCode:10, licensee:11, expiryDate:13,
  };

  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0,10);
    if (typeof v === 'string') return v.slice(0,10);
    return null;
  }

  function xlsxRowToLicense(row) {
    const rawCity = (row[XLSX_COLS.city]||'').trim();
    return {
      licence_number: String(row[XLSX_COLS.licenceNumber]||'').trim(),
      licence_type:   (row[XLSX_COLS.licenceType]||'').trim(),
      establishment:  (row[XLSX_COLS.establishment]||'').trim(),
      address:        (row[XLSX_COLS.address]||'').trim(),
      city:           rawCity.replace(/\b\w/g,c=>c.toUpperCase()),
      postal_code:    (row[XLSX_COLS.postalCode]||'').trim().toUpperCase(),
      licensee:       (row[XLSX_COLS.licensee]||'').trim(),
      expiry_date:    parseDate(row[XLSX_COLS.expiryDate]),
      region:         cityToRegion(rawCity),
      updated_at:     new Date().toISOString(),
    };
  }

  async function handleFile(f) {
    if (!f) return;
    setFile(f); setPreview(null); setUpsertResult(null); setUpsertError(null);
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array', cellDates:true });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      const data = raw.slice(1).filter(r => r[XLSX_COLS.licenceNumber]);
      const parsed = data.map(xlsxRowToLicense).filter(r => r.licence_number);
      const previewRows = parsed.slice(0,5);
      setPreview({ parsed, previewRows, total: parsed.length });
    } catch(e) { showToast(dispatch, 'Parse failed: '+e.message, 'error'); }
    finally { setParsing(false); }
  }

  async function handleUpsert() {
    if (!preview?.parsed) return;
    setUpserting(true); setUpsertResult(null); setUpsertError(null);
    try {
      const enabled = Object.entries(typeFilter).filter(([,v])=>v).map(([k])=>k);
      const rows = preview.parsed.filter(r => enabled.includes(r.licence_type));
      const result = await dbUpsertLicenses(rows);
      setUpsertResult({ ...result, filtered: rows.length, skipped: preview.total - rows.length });
      showToast(dispatch, `✅ ${rows.length.toLocaleString()} licences saved`, 'success');
    } catch(e) { setUpsertError(e.message); showToast(dispatch, 'Save failed: '+e.message, 'error'); }
    finally { setUpserting(false); }
  }

  const TYPES = Object.keys(typeFilter);
  const filteredRows = preview ? preview.parsed.filter(r=>typeFilter[r.licence_type]) : [];
  const enabledCount = filteredRows.length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white text-sm">🏛️</div>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">BC Liquor Licence Upload</h1>
          <p className="text-xs text-gray-400">One-time setup — only come back here when BC releases a new file. Find prospects under <strong>Prospecting → Licence Prospects</strong>.</p>
        </div>
      </div>

      {/* File picker */}
      <Card cls="p-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 cursor-pointer hover:border-teal-400 transition-colors">
          <span className="text-3xl mb-2">📂</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{file ? file.name : 'Click to choose .xlsx file'}</span>
          <span className="text-xs text-gray-400 mt-1">all_liquor_licensed_establishments_in_bc.xlsx</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
        </label>
        {parsing && <p className="text-xs text-center text-teal-600 mt-2 animate-pulse">Parsing spreadsheet…</p>}
      </Card>

      {/* Licence type filter */}
      <Card cls="p-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Include Licence Types</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t=>(
            <button key={t} onClick={()=>setTypeFilter(f=>({...f,[t]:!f[t]}))}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${typeFilter[t]?'bg-teal-600 text-white border-teal-600':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-teal-400'}`}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      {/* Preview */}
      {preview && (
        <Card cls="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Preview — {preview.total.toLocaleString()} rows found in file</p>
              <p className="text-xs text-gray-400">{enabledCount.toLocaleString()} will be saved with the selected types</p>
            </div>
            <button onClick={handleUpsert} disabled={upserting || enabledCount===0}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition-colors">
              {upserting ? 'Saving…' : `Save ${enabledCount.toLocaleString()} licences`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Licence #','Type','Establishment','City','Region','Postal','Expiry'].map(h=>(
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0,5).map((r,i)=>(
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="py-1.5 pr-3 font-mono text-gray-700 dark:text-gray-300">{r.licence_number}</td>
                    <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{r.licence_type}</td>
                    <td className="py-1.5 pr-3 text-gray-800 dark:text-gray-200 max-w-[180px] truncate">{r.establishment||<span className="text-gray-400 italic">—</span>}</td>
                    <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{r.city||'—'}</td>
                    <td className="py-1.5 pr-3">
                      {r.region
                        ? <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-medium">{r.region}</span>
                        : <span className="text-gray-400 text-[10px]">unmapped</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-500 font-mono">{r.postal_code}</td>
                    <td className="py-1.5 text-gray-400">{r.expiry_date||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {enabledCount > 5 && <p className="text-[10px] text-gray-400 mt-2">…and {(enabledCount-5).toLocaleString()} more rows</p>}
          </div>
        </Card>
      )}

      {/* Result */}
      {upsertResult && (
        <Card cls="p-4 border-l-4 border-l-emerald-400">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">✅ Upload complete</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{upsertResult.filtered.toLocaleString()} licences saved · {upsertResult.skipped.toLocaleString()} skipped (type not selected)</p>
          <p className="text-xs text-gray-400 mt-0.5">Re-uploading this file later will update existing records automatically.</p>
        </Card>
      )}
      {upsertError && (
        <Card cls="p-4 border-l-4 border-l-red-400">
          <p className="text-xs font-semibold text-red-600">Upload error</p>
          <p className="text-xs text-gray-500 mt-0.5">{upsertError}</p>
        </Card>
      )}

      {/* Geocoder */}
      <GeocoderCard />
    </div>
  );
}

// ── Batch Geocoder ────────────────────────────────────────────────────────────
function GeocoderCard() {
  const [geoStatus, setGeoStatus] = useState(null);
  const [geoTotal, setGeoTotal]   = useState(0);
  const [geoDone, setGeoDone]     = useState(0);
  const [geoErrors, setGeoErrors] = useState(0);
  const stopRef = useRef(false);

  async function countPending() {
    setGeoStatus('counting');
    // Count unique cities that have no lat/lng on any of their licences
    const { data } = await sb.from('licenses').select('city').is('latitude', null).not('city', 'is', null);
    const cities = [...new Set((data||[]).map(r=>r.city).filter(Boolean))];
    setGeoTotal(cities.length);
    setGeoStatus(cities.length > 0 ? 'ready' : 'done');
  }

  async function startGeocoding() {
    stopRef.current = false;
    setGeoStatus('running'); setGeoDone(0); setGeoErrors(0);

    // Get all unique cities that still need coordinates
    const { data } = await sb.from('licenses').select('city').is('latitude', null).not('city', 'is', null);
    const cities = [...new Set((data||[]).map(r=>r.city).filter(Boolean))];
    setGeoTotal(cities.length);

    for (const city of cities) {
      if (stopRef.current) break;
      try {
        // Use OpenStreetMap Nominatim — free, no key needed
        const q = encodeURIComponent(`${city}, BC, Canada`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=ca`, {
          headers: { 'User-Agent': 'SuenosTequilaCRM/1.0 (internal)' }
        });
        const json = await res.json();
        if (json && json[0]) {
          const lat = parseFloat(json[0].lat);
          const lng = parseFloat(json[0].lon);
          // Update all licences in this city that have no coordinates
          await sb.from('licenses').update({ latitude: lat, longitude: lng }).eq('city', city).is('latitude', null);
          setGeoDone(d => d+1);
        } else {
          setGeoErrors(e => e+1);
        }
      } catch { setGeoErrors(e => e+1); }
      // Nominatim rate limit: 1 req/sec
      await new Promise(r => setTimeout(r, 1100));
    }
    setGeoStatus(stopRef.current ? 'stopped' : 'done');
  }

  return (
    <Card cls="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5">📍 Auto-map licences</p>
          <p className="text-xs text-gray-400">Adds GPS coordinates so "Find nearest" works. Geocodes by city (~200 lookups, ~4 min) using free OpenStreetMap data — no API key needed.</p>
        </div>
        <div className="flex-shrink-0 text-right space-y-1">
          {!geoStatus && <button onClick={countPending} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors">Check status</button>}
          {geoStatus==='counting' && <span className="text-xs text-gray-400 animate-pulse">Checking…</span>}
          {geoStatus==='ready' && <>
            <p className="text-xs text-gray-500">{geoTotal} cities to geocode</p>
            <button onClick={startGeocoding} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors">Start mapping</button>
          </>}
          {geoStatus==='running' && <>
            <p className="text-xs text-teal-600 font-medium animate-pulse">{geoDone}/{geoTotal} cities done{geoErrors>0?` · ${geoErrors} not found`:''}</p>
            <button onClick={()=>stopRef.current=true} className="px-2.5 py-1 text-xs rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50">Stop</button>
          </>}
          {(geoStatus==='done'||geoStatus==='stopped') && <>
            <p className="text-xs text-emerald-600 font-medium">{geoStatus==='done'?'✅ Done':'⏹ Stopped'} — {geoDone} cities mapped{geoErrors>0?`, ${geoErrors} skipped`:''}</p>
            <button onClick={countPending} className="text-xs text-gray-400 underline">Refresh</button>
          </>}
        </div>
      </div>
      {geoStatus==='running' && geoTotal > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{width:`${Math.min(100,(geoDone/geoTotal)*100)}%`}}/>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{Math.round((geoDone/geoTotal)*100)}% · ~{Math.max(0,geoTotal-geoDone)} cities left · don't close this tab</p>
        </div>
      )}
    </Card>
  );
}

// ── Licence Prospects (Rep + Admin) ──────────────────────────────────────────
function LicenseProspectsView() {
  const { state, dispatch } = useApp();
  const { accounts, users, licenseDismissals } = state;
  const user = state.user;
  const isAdmin = user?.role === 'admin';

  const [licences, setLicences]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [dismissingId, setDismissingId] = useState(null);
  const [assigningLic, setAssigningLic] = useState(null); // licence being assigned
  const [assignRepId, setAssignRepId]   = useState('');
  const [assignNote, setAssignNote]     = useState('Hey, this would be a great location to hit!');
  const [assigning, setAssigning]       = useState(false);
  const PAGE_SIZE = 50;

  // Rep's regions
  const myRegions = isAdmin ? null : (user?.regions || []);

  // Normalise name for matching
  function normName(n) { return (n||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim(); }

  // Set of dismissed licence numbers
  const dismissedSet = useMemo(()=>new Set(licenseDismissals.map(d=>d.licenceNumber)), [licenseDismissals]);

  // Set of licence numbers already matched to accounts (by licenseNumber field or name)
  const accountLicNums = useMemo(()=>new Set(accounts.map(a=>a.licenseNumber).filter(Boolean)), [accounts]);
  const accountNormNames = useMemo(()=>accounts.map(a=>normName(a.name)), [accounts]);

  function isMatched(lic) {
    if (accountLicNums.has(lic.licenceNumber)) return true;
    if (!lic.establishment) return false;
    const licN = normName(lic.establishment);
    return accountNormNames.some(an => an && licN && (licN.includes(an) || an.includes(licN)));
  }

  async function loadPage(reset=false) {
    setLoading(true);
    try {
      const offset = reset ? 0 : licences.length;
      let q = sb.from('licenses').select('*').order('city').order('establishment');
      // Always exclude types with no useful establishment data
      q = q.not('licence_type', 'in', '("Agent","UBrew and UVin")');
      if (!isAdmin && myRegions?.length) q = q.in('region', myRegions);
      if (regionFilter) q = q.eq('region', regionFilter);
      if (typeFilter !== 'all') q = q.eq('licence_type', typeFilter);
      if (cityFilter.trim()) q = q.ilike('city', `%${cityFilter.trim()}%`);
      if (search.trim()) q = q.ilike('establishment', `%${search.trim()}%`);
      q = q.range(offset, offset + PAGE_SIZE - 1);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      if (reset) setLicences(rows);
      else setLicences(prev => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch(e) { showToast(dispatch, 'Load failed: '+e.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ setPage(0); setHasMore(true); loadPage(true); }, [typeFilter, regionFilter, cityFilter]);

  function handleSearch(e) {
    if (e.key==='Enter') { setPage(0); setHasMore(true); loadPage(true); }
  }

  const LICENCE_TYPE_TO_ACCOUNT_TYPE = {
    'Food Primary':'Restaurant', 'Liquor Primary':'Bar', 'Liquor Primary Club':'Bar',
    'Licensee Retail Store':'Retail', 'Rural Licensee Retail Store':'Retail',
    'Wine Store':'Retail', 'Manufacturer':'Other', 'Catering':'Other',
  };

  async function createProspect(lic) {
    const address = [lic.address, lic.city, lic.postal_code].filter(Boolean).join(', ');
    const account = {
      id: genId(),
      name: lic.establishment || lic.licensee || '',
      type: LICENCE_TYPE_TO_ACCOUNT_TYPE[lic.licence_type] || 'Other',
      region: lic.region || '',
      address,
      status: 'Prospect',
      licenseNumber: lic.licence_number,
      liquorLicenseName: lic.licensee || '',
      notes: `Imported from BC Liquor Licence registry.\nLicence type: ${lic.licence_type}\nExpiry: ${lic.expiry_date||'—'}`,
      contact: '', email: '', phone: '', website: '',
      assignedRep: null, menuPlacements: {},
    };
    await dbAddAccount(dispatch, account);
    showToast(dispatch, `${account.name} added as a Prospect`, 'success');
    dispatch({type:'NAV', view:'account-detail', params:{id:account.id}});
  }

  async function dismiss(lic, reason) {
    setDismissingId(lic.licence_number);
    await dbDismissLicense(dispatch, lic.licence_number, reason, user.id);
    setDismissingId(null);
  }

  async function sendToRep(lic) {
    if (!assignRepId) return;
    setAssigning(true);
    try {
      const rep = reps.find(r => r.id === assignRepId);
      const address = [lic.address, lic.city, lic.postal_code].filter(Boolean).join(', ');
      const title = `Check out ${lic.establishment||lic.licensee} — potential new account`;
      const dueDate = new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10);
      const task = {
        id: genId(), title, repId: assignRepId, dueDate, priority: 'medium', done: false,
        notes: `${assignNote}\n\n📍 ${address}\nLicence #${lic.licence_number} · ${lic.licence_type}`,
      };
      await dbAddTask(dispatch, task);
      if (rep?.email) {
        await sendTaskNotification({
          to_email: rep.email, to_name: rep.name||rep.email,
          task_title: title,
          task_due: dueDate,
          task_notes: task.notes,
          assigned_by: user.name||user.email,
        });
      }
      showToast(dispatch, `Task sent to ${rep?.name||'rep'}`, 'success');
      setAssigningLic(null);
      setAssignRepId('');
      setAssignNote('Hey, this would be a great location to hit!');
    } catch(e) { showToast(dispatch, 'Failed: '+e.message, 'error'); }
    finally { setAssigning(false); }
  }

  // Filter out matched + dismissed client-side
  const visible = licences.filter(l => !isMatched(l) && !dismissedSet.has(l.licence_number));

  // Reps for assignment
  const reps = useMemo(() => (users||[]).filter(u => u.role === 'rep' || u.role === 'admin'), [users]);

  // Haversine distance in km
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Near-account mode
  const [nearAccountId, setNearAccountId] = useState('');
  const [nearResults, setNearResults]     = useState(null); // null = not in near mode
  const [nearLoading, setNearLoading]     = useState(false);
  const nearAccount = useMemo(() => nearAccountId ? accounts.find(a=>a.id===nearAccountId) : null, [nearAccountId, accounts]);

  async function loadNear(acc) {
    if (!acc) { setNearResults(null); return; }
    setNearLoading(true);
    try {
      // Build query — prefer geocoded results in the same region
      let q = sb.from('licenses').select('*')
        .not('licence_type', 'in', '("Agent","UBrew and UVin")')
        .not('latitude', 'is', null);
      if (acc.region) q = q.eq('region', acc.region);
      q = q.limit(500);
      const { data } = await q;
      const rows = data || [];

      if (acc.lat && acc.lng && rows.length > 0) {
        // True distance sort — pick nearest 5 unmatched
        const withDist = rows
          .filter(l => !isMatched(l) && !dismissedSet.has(l.licence_number))
          .map(l => ({ ...l, _km: haversine(acc.lat, acc.lng, l.latitude, l.longitude) }))
          .sort((a,b) => a._km - b._km)
          .slice(0, 5);
        setNearResults(withDist);
      } else {
        // No account coordinates — fall back to region, show first 5 unmatched
        const unmatched = rows
          .filter(l => !isMatched(l) && !dismissedSet.has(l.licence_number))
          .slice(0, 5);
        setNearResults(unmatched);
      }
    } catch(e) { showToast(dispatch, 'Load failed: '+e.message, 'error'); }
    finally { setNearLoading(false); }
  }

  useEffect(() => {
    if (nearAccount) loadNear(nearAccount);
    else setNearResults(null);
  }, [nearAccount, dismissedSet]);

  const sortedAccounts = useMemo(() =>
    [...accounts].sort((a,b)=>(a.name||'').localeCompare(b.name||'')), [accounts]);

  const TYPES = ['all','Food Primary','Liquor Primary','Liquor Primary Club','Licensee Retail Store','Rural Licensee Retail Store','Wine Store','Manufacturer','Catering'];
  const regionNames = state.regions?.length ? state.regions.map(r=>r.name) : [];

  const TYPE_COLORS = {
    'Food Primary':'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    'Liquor Primary':'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    'Liquor Primary Club':'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    'Licensee Retail Store':'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    'Rural Licensee Retail Store':'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
    'Wine Store':'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
    'Agent':'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
    'Manufacturer':'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'Catering':'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    'UBrew and UVin':'bg-lime-50 text-lime-700 dark:bg-lime-900/20 dark:text-lime-400',
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white text-sm">🔍</div>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Licence Prospects</h1>
          <p className="text-xs text-gray-400">Licensed establishments not yet in your accounts · {dismissedSet.size} dismissed</p>
        </div>
      </div>

      {/* Near-account finder */}
      <Card cls="p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">📍 Find nearest licences to</span>
          <select value={nearAccountId} onChange={e=>setNearAccountId(e.target.value)}
            className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
            <option value="">— pick an account —</option>
            {sortedAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {nearAccount && <button onClick={()=>setNearAccountId('')} className="text-[10px] text-gray-400 hover:text-gray-600 underline">Clear</button>}
        </div>

        {nearLoading && <p className="text-xs text-gray-400 animate-pulse">Finding nearest licences…</p>}

        {nearResults && !nearLoading && nearResults.length === 0 && (
          <p className="text-xs text-gray-400">No geocoded licences found in this region yet — run <strong>Auto-map licences</strong> in the upload page first.</p>
        )}

        {nearResults && !nearLoading && nearResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
              {nearAccount?.lat ? 'Nearest 5 by distance' : 'Nearest 5 in region (map licences for true distance)'}
            </p>
            {nearResults.map(lic=>(
              <div key={lic.licence_number} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{lic.establishment||lic.licensee}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${TYPE_COLORS[lic.licence_type]||'bg-gray-100 text-gray-500'}`}>{lic.licence_type}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">{[lic.address, lic.city].filter(Boolean).join(', ')}</p>
                  {lic._km != null && <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">{lic._km < 1 ? `${Math.round(lic._km*1000)}m away` : `${lic._km.toFixed(1)} km away`}</p>}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={()=>createProspect(lic)} className="px-2 py-0.5 text-[10px] font-medium rounded-lg border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 whitespace-nowrap">+ Account</button>
                  <button onClick={()=>dismiss(lic,'not_interested')} className="px-2 py-0.5 text-[10px] rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 whitespace-nowrap">✕ Skip</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={handleSearch}
          placeholder="Establishment name…"
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-44"/>
        <input value={cityFilter} onChange={e=>setCityFilter(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ setPage(0); setHasMore(true); loadPage(true); }}}
          placeholder="City…"
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-32"/>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          {TYPES.map(t=><option key={t} value={t}>{t==='all'?'All Types':t}</option>)}
        </select>
        {isAdmin && (
          <select value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
            <option value="">All Regions</option>
            {regionNames.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <button onClick={()=>{ setPage(0); setHasMore(true); loadPage(true); }} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
          🔍 Search
        </button>
      </div>

      {/* Info strip */}
      <div className="text-xs text-gray-400 flex items-center gap-2">
        <span>Showing {visible.length} likely new</span>
        {licences.length > visible.length && <span>· {licences.length - visible.length} already matched or dismissed hidden</span>}
        <span className="text-[10px] bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">Results are "likely new" — name matching is approximate</span>
      </div>

      {/* Cards */}
      {loading && licences.length===0 ? (
        <div className="text-center py-16"><p className="text-sm text-gray-400 animate-pulse">Loading licences…</p></div>
      ) : (
        <div className="space-y-2">
          {visible.length===0 && !hasMore && !loading && (
            <div className="text-center py-16">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No unmatched licences found</p>
              <p className="text-xs text-gray-400 mt-1">All visible licences are already in your accounts or dismissed.</p>
            </div>
          )}
          {visible.map(lic=>(
            <Card key={lic.licence_number} cls="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lic.establishment||lic.licensee||'—'}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${TYPE_COLORS[lic.licence_type]||'bg-gray-100 text-gray-500'}`}>{lic.licence_type}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{[lic.address, lic.city, lic.postal_code].filter(Boolean).join(' · ')}</p>
                  {lic.licensee && lic.licensee !== lic.establishment && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Licensee: {lic.licensee}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-400 font-mono">#{lic.licence_number}</span>
                    {lic.region && <span className="text-[10px] text-teal-600 dark:text-teal-400">{lic.region}</span>}
                    {lic.expiry_date && <span className="text-[10px] text-gray-400">Exp {lic.expiry_date}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={()=>createProspect(lic)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors whitespace-nowrap">
                    + Create Account
                  </button>
                  {isAdmin && (
                    <button onClick={()=>{ setAssigningLic(assigningLic===lic.licence_number?null:lic.licence_number); setAssignRepId(''); }}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap ${assigningLic===lic.licence_number?'bg-violet-600 text-white border-violet-600':'border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}>
                      → Send to Rep
                    </button>
                  )}
                  <button onClick={()=>dismiss(lic,'already_ours')} disabled={dismissingId===lic.licence_number}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-colors whitespace-nowrap">
                    ✓ Already Ours
                  </button>
                  <button onClick={()=>dismiss(lic,'not_interested')} disabled={dismissingId===lic.licence_number}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap">
                    ✕ Not Interested
                  </button>
                </div>
              </div>
              {/* Inline assign panel */}
              {isAdmin && assigningLic===lic.licence_number && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <select value={assignRepId} onChange={e=>setAssignRepId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    <option value="">Select a rep…</option>
                    {reps.map(r=><option key={r.id} value={r.id}>{r.name||r.email}</option>)}
                  </select>
                  <textarea value={assignNote} onChange={e=>setAssignNote(e.target.value)} rows={2}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 resize-none"/>
                  <div className="flex gap-2 justify-end">
                    <button onClick={()=>setAssigningLic(null)} className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={()=>sendToRep(lic)} disabled={!assignRepId||assigning}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-colors">
                      {assigning ? 'Sending…' : 'Send Task'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {hasMore && (
            <button onClick={()=>loadPage(false)} disabled={loading}
              className="w-full py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── WEB ANALYTICS VIEW (GA4) ─────────────────────────────────────────────────
// City → [lat, lng] for map markers (major cities we're likely to see)
const CITY_COORDS = {
  // BC — Metro Vancouver
  'Vancouver':{'lat':49.28,'lng':-123.12},'Surrey':{'lat':49.19,'lng':-122.85},
  'Burnaby':{'lat':49.25,'lng':-122.95},'Richmond':{'lat':49.17,'lng':-123.14},
  'North Vancouver':{'lat':49.32,'lng':-123.07},'Coquitlam':{'lat':49.28,'lng':-122.79},
  'Port Coquitlam':{'lat':49.26,'lng':-122.77},'Port Moody':{'lat':49.28,'lng':-122.84},
  'New Westminster':{'lat':49.21,'lng':-122.91},'Delta':{'lat':49.09,'lng':-123.08},
  'Langley':{'lat':49.10,'lng':-122.65},'Langley Township':{'lat':49.10,'lng':-122.58},
  'Maple Ridge':{'lat':49.22,'lng':-122.60},'Pitt Meadows':{'lat':49.22,'lng':-122.69},
  'Abbotsford':{'lat':49.05,'lng':-122.33},'Chilliwack':{'lat':49.16,'lng':-121.95},
  // BC — Vancouver Island
  'Victoria':{'lat':48.43,'lng':-123.37},'Oak Bay':{'lat':48.43,'lng':-123.32},
  'Colwood':{'lat':48.44,'lng':-123.50},'Langford':{'lat':48.45,'lng':-123.51},
  'Shawnigan Lake':{'lat':48.65,'lng':-123.63},'Nanaimo':{'lat':49.16,'lng':-123.94},
  'Courtenay':{'lat':49.69,'lng':-124.99},'Comox':{'lat':49.67,'lng':-124.93},
  'Port Alberni':{'lat':49.23,'lng':-124.80},
  // BC — Interior & North
  'Kelowna':{'lat':49.89,'lng':-119.49},'Vernon':{'lat':50.27,'lng':-119.27},
  'Penticton':{'lat':49.49,'lng':-119.59},'Kamloops':{'lat':50.67,'lng':-120.33},
  'Salmon Arm':{'lat':50.70,'lng':-119.28},'Whistler':{'lat':50.12,'lng':-122.96},
  'Gibsons':{'lat':49.40,'lng':-123.51},'Powell River':{'lat':49.84,'lng':-124.52},
  'Kitimat':{'lat':54.05,'lng':-128.66},'Vanderhoof':{'lat':54.02,'lng':-124.01},
  // BC — Sunshine Coast
  'Squamish':{'lat':49.70,'lng':-123.16},
  // Rest of Canada
  'Calgary':{'lat':51.05,'lng':-114.07},'Edmonton':{'lat':53.55,'lng':-113.49},
  'Toronto':{'lat':43.65,'lng':-79.38},'Oakville':{'lat':43.45,'lng':-79.69},
  'Montreal':{'lat':45.50,'lng':-73.57},'Ottawa':{'lat':45.42,'lng':-75.69},
  'Winnipeg':{'lat':49.90,'lng':-97.14},'Saskatoon':{'lat':52.13,'lng':-106.67},
  'Regina':{'lat':50.45,'lng':-104.62},'Halifax':{'lat':44.65,'lng':-63.58},
  'Quebec City':{'lat':46.81,'lng':-71.21},
  // USA
  'New York':{'lat':40.71,'lng':-74.01},'Los Angeles':{'lat':34.05,'lng':-118.24},
  'Chicago':{'lat':41.88,'lng':-87.63},'Houston':{'lat':29.76,'lng':-95.37},
  'Seattle':{'lat':47.61,'lng':-122.33},'San Francisco':{'lat':37.77,'lng':-122.42},
  'Prineville':{'lat':44.30,'lng':-120.83},'Council Bluffs':{'lat':41.26,'lng':-95.86},
  'Forest City':{'lat':43.26,'lng':-93.64},'Altoona':{'lat':40.52,'lng':-78.40},
  // Europe
  'London':{'lat':51.51,'lng':-0.13},'Paris':{'lat':48.86,'lng':2.35},
  'Berlin':{'lat':52.52,'lng':13.40},'Dublin':{'lat':53.33,'lng':-6.25},
  'Rome':{'lat':41.90,'lng':12.50},'Lulea':{'lat':65.58,'lng':22.16},
  // Asia
  'Tokyo':{'lat':35.69,'lng':139.69},'Seoul':{'lat':37.57,'lng':126.98},
  'Singapore':{'lat':1.35,'lng':103.82},'Hong Kong':{'lat':22.32,'lng':114.17},
  'Shanghai':{'lat':31.23,'lng':121.47},'Beijing':{'lat':39.91,'lng':116.39},
  'Chengdu':{'lat':30.57,'lng':104.07},'Hangzhou':{'lat':30.27,'lng':120.15},
  // Other
  'Sydney':{'lat':-33.87,'lng':151.21},
};

function LiveMapPanel({ live=null, loading=false, total=null, cities=[], days=30 }) {
  const mapRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const markersRef = React.useRef([]);

  // Init Leaflet map
  React.useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, {
      center: [52, -100], zoom: 3,
      zoomControl: true, attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
    leafletMap.current = map;
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [mapRef.current]);

  // Plot historical city data on map (always has data, sized by sessions)
  React.useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (!cities || cities.length === 0) return;

    const maxSessions = Math.max(...cities.map(c => Number(c.sessions)||0), 1);
    cities.forEach(city => {
      const coords = CITY_COORDS[city.city];
      if (!coords) return;
      const s = Number(city.sessions) || 0;
      if (!s) return;
      const r = Math.max(5, Math.min(28, 5 + (s / maxSessions) * 23));
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: r, fillColor: '#6366f1', color: '#818cf8',
        weight: 1.5, opacity: 0.85, fillOpacity: 0.35,
      }).bindTooltip(
        `<strong>${city.city}</strong><br/>${s.toLocaleString()} sessions · last ${days} days`,
        { permanent: false }
      ).addTo(map);
      markersRef.current.push(marker);
    });
  }, [cities, days]);

  const pages = live?.byPage || [];
  const displayTotal = total != null ? total : (live?.total || 0);
  const topCities = (cities || []).slice(0, 8);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"/>
            <span className="text-gray-900 dark:text-white font-bold text-sm">Live Now</span>
            <span className="text-2xl font-black text-emerald-600 ml-1">{loading ? '…' : displayTotal}</span>
            <span className="text-gray-500 text-xs">active {displayTotal===1?'visitor':'visitors'}</span>
          </div>
          <span className="text-gray-300 dark:text-gray-700 text-xs">·</span>
          <span className="text-[10px] text-gray-400">Map shows {days}-day sessions by city</span>
        </div>
        <span className="text-[10px] text-gray-400">Updates every 15s</span>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Map */}
        <div ref={mapRef} style={{height:320, flex:2, minWidth:0, background:'#e8e8e8'}}/>

        {/* Right panel */}
        <div className="flex-1 min-w-0 flex flex-col divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto" style={{maxHeight:320}}>

          {/* Live pages — always shown */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
              </span>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">On site right now</p>
            </div>
            {loading ? (
              <p className="text-gray-400 text-xs italic">Loading…</p>
            ) : pages.length === 0 && displayTotal === 0 ? (
              <p className="text-gray-400 text-xs italic">No active visitors</p>
            ) : pages.length === 0 ? (
              <p className="text-gray-400 text-xs italic">{displayTotal} visitor{displayTotal!==1?'s':''} active · GA4 needs 5+ per page to show breakdown</p>
            ) : (
              pages.slice(0,6).map((p,i) => {
                const path = String(p.page||'').replace(/^https?:\/\/suenos\.ca/,'') || '/';
                return (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{Number(p.users)}</span>
                    <span className="text-gray-600 dark:text-gray-300 text-xs truncate" title={path}>{path}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Live locations — shown when available, graceful fallback */}
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Live locations</p>
            {(() => {
              const locs = live?.byLocation || [];
              if (loading) return <p className="text-gray-400 text-xs italic">Loading…</p>;
              if (locs.length > 0) {
                return locs.slice(0,5).map((loc,i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{Number(loc.users)}</span>
                    <span className="text-gray-600 dark:text-gray-300 text-xs truncate">{loc.city && loc.city !== '(not set)' ? `${loc.city}, ${loc.country}` : loc.country || 'Unknown'}</span>
                  </div>
                ));
              }
              if (displayTotal > 0) {
                return <p className="text-gray-400 text-xs italic">{displayTotal} visitor{displayTotal!==1?'s':''} active · GA4 needs 5+ per city to show locations</p>;
              }
              return <p className="text-gray-400 text-xs italic">No active visitors</p>;
            })()}
          </div>

          {/* Historical top cities */}
          <div className="p-3 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
              Top Cities · {days}d
            </p>
            {topCities.length === 0 && (
              <p className="text-gray-400 text-xs italic">Loading city data…</p>
            )}
            {topCities.slice(0,6).map((c,i) => {
              const maxS = topCities[0] ? Number(topCities[0].sessions)||1 : 1;
              const pct = Math.round((Number(c.sessions)||0) / maxS * 100);
              return (
                <div key={i} className="py-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{c.city}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-2 flex-shrink-0">{Number(c.sessions).toLocaleString()}</span>
                  </div>
                  <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-400 transition-all" style={{width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchConsoleCard({ gscData, gscLoading, gscError, days }) {
  if (gscError) {
    const isSetup = gscError.includes('403') || gscError.includes('404') || gscError.includes('not found') || gscError.includes('permission');
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔍</span>
          <h2 className="font-bold text-gray-800 dark:text-white text-sm">Organic Search Queries</h2>
        </div>
        {isSetup ? (
          <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 space-y-1">
            <p className="font-semibold">Search Console not connected yet.</p>
            <p>To enable: open <strong>Google Search Console</strong>, go to Settings → Users and permissions, add your service account email as <strong>Full User</strong>.</p>
            <p className="text-gray-400 mt-1">Also ensure the <strong>Search Console API</strong> is enabled in Google Cloud Console.</p>
          </div>
        ) : (
          <p className="text-red-500 text-xs">{gscError}</p>
        )}
      </div>
    );
  }

  if (gscLoading && !gscData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-48 mb-4"/>
        <div className="space-y-2">{[...Array(5)].map((_,i)=>(
          <div key={i} className="h-2 bg-gray-100 dark:bg-gray-800 rounded" style={{width:`${80-i*10}%`}}/>
        ))}</div>
      </div>
    );
  }

  if (!gscData) return null;

  const { summary = {}, queries = [], pages = [] } = gscData;
  const maxClicks = Math.max(...queries.map(q => Number(q.clicks)||0), 1);

  const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const fmtPos  = (p) => { const n = Number(p); return isNaN(n) || n === 0 ? '—' : `#${n}`; };
  const positionColor = (p) => {
    const n = Number(p);
    if (isNaN(n) || n === 0) return 'text-gray-400';
    if (n <= 3)  return 'text-emerald-600';
    if (n <= 10) return 'text-amber-500';
    return 'text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white text-sm">Organic Search Queries</h2>
            <p className="text-[11px] text-gray-400">What people searched to find you · last {days} days · via Google Search Console</p>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Clicks',   value: (summary.clicks||0).toLocaleString(),       accent: '#10b981' },
          { label: 'Impressions',    value: (summary.impressions||0).toLocaleString(),   accent: '#6366f1' },
          { label: 'Avg CTR',        value: `${summary.ctr ?? 0}%`,                      accent: '#f59e0b' },
          { label: 'Avg Position',   value: summary.position ?? '—',                     accent: summary.position <= 10 ? '#10b981' : '#94a3b8' },
        ].map((k,i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-lg font-black" style={{color: k.accent}}>{k.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Top queries */}
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Top Search Queries</p>
        {queries.length === 0 ? (
          <p className="text-gray-400 text-xs italic">No query data for this period.</p>
        ) : (
          <div className="space-y-1">
            {queries.slice(0,15).map((q,i) => {
              const pct = Math.round((Number(q.clicks)||0) / maxClicks * 100);
              return (
                <div key={i} className="group">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-[10px] text-gray-300 text-right flex-shrink-0">{i+1}</span>
                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{q.query}</span>
                    <span className="text-gray-400 flex-shrink-0 w-10 text-right">{safeNum(q.clicks).toLocaleString()} <span className="text-gray-300">clk</span></span>
                    <span className="text-gray-300 flex-shrink-0 w-14 text-right">{safeNum(q.impressions).toLocaleString()} <span className="text-gray-200">imp</span></span>
                    <span className={`flex-shrink-0 w-10 text-right font-semibold ${positionColor(q.position)}`}>{fmtPos(q.position)}</span>
                  </div>
                  <div className="ml-5 mt-0.5 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top pages by organic */}
      {pages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Top Landing Pages (Organic)</p>
          <div className="space-y-1">
            {pages.slice(0,6).map((p,i) => {
              const pct = Math.round((Number(p.clicks)||0) / Math.max(...pages.map(x=>Number(x.clicks)||0), 1) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-[10px] text-gray-300 text-right flex-shrink-0">{i+1}</span>
                    <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">{p.page || '/'}</span>
                    <span className="text-gray-400 flex-shrink-0">{safeNum(p.clicks).toLocaleString()} clk</span>
                    <span className={`flex-shrink-0 w-10 text-right font-semibold text-xs ${positionColor(p.position)}`}>{fmtPos(p.position)}</span>
                  </div>
                  <div className="ml-5 mt-0.5 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-400 transition-all" style={{width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function WebAnalyticsView() {
  const { state } = useApp();
  const isAdmin = state.user?.role === 'admin';

  const [data, setData]           = React.useState(null);
  const [loading, setLoading]     = React.useState(true);
  const [error, setError]         = React.useState(null);
  const [lastFetch, setLastFetch] = React.useState(null);
  const [realtimeUsers, setRealtimeUsers] = React.useState(null);
  const [liveData, setLiveData]   = React.useState(null);
  const [liveLoading, setLiveLoading] = React.useState(true);
  const [days, setDays]           = React.useState(30);
  const [gscData, setGscData]     = React.useState(null);
  const [gscLoading, setGscLoading] = React.useState(false);
  const [gscError, setGscError]   = React.useState(null);
  const [expandedChannel, setExpandedChannel] = React.useState(null);

  async function fetchAll(d) {
    const numDays = d || days;
    setLoading(true); setError(null);
    try {
      const { data: res, error: fnErr } = await sb.functions.invoke('ga4-analytics', { body: { days: numDays } });
      if (fnErr) throw new Error(fnErr.message || String(fnErr));
      if (res?.error) throw new Error(res.error);
      setData(res);
      setRealtimeUsers(res.realtime ?? null);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGSC(d) {
    const numDays = d || days;
    setGscLoading(true); setGscError(null);
    try {
      const { data: res, error: fnErr } = await sb.functions.invoke('search-console', { body: { days: numDays } });
      if (fnErr) throw new Error(fnErr.message || String(fnErr));
      if (res?.error) throw new Error(res.error);
      setGscData(res);
    } catch (e) {
      setGscError(e.message);
    } finally {
      setGscLoading(false);
    }
  }

  function changeDays(d) {
    setDays(d);
    setData(null);
    setGscData(null);
    fetchAll(d);
    fetchGSC(d);
  }

  async function fetchLive() {
    try {
      const { data: res, error: fnErr } = await sb.functions.invoke('ga4-analytics', { body: { mode: 'realtime' } });
      if (fnErr || res?.error) return;
      if (res?.total != null) {
        setLiveData(res);
        setRealtimeUsers(res.total); // keep KPI card in sync
      }
    } catch(e) { console.warn('LiveMap:', e.message); }
    finally { setLiveLoading(false); }
  }

  React.useEffect(() => {
    fetchAll();
    fetchLive();
    fetchGSC();
    // GA4 has a small hourly quota on realtime queries — poll conservatively.
    const slowId = setInterval(fetchAll, 300000);  // historical: every 5 min
    const fastId = setInterval(fetchLive, 60000);  // realtime: every 60 s
    return () => { clearInterval(slowId); clearInterval(fastId); };
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────
  function fmtDuration(s) {
    if (!s && s !== 0) return '—';
    const m = Math.floor(s / 60), sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }
  function fmtNum(n) {
    if (n == null) return '—';
    return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(Math.round(n));
  }
  function channelColor(ch) {
    const c = (ch||'').toLowerCase();
    if (c.includes('organic')) return '#10b981';
    if (c.includes('direct'))  return '#6366f1';
    if (c.includes('social'))  return '#f59e0b';
    if (c.includes('paid') || c.includes('cpc')) return '#ef4444';
    if (c.includes('email'))   return '#3b82f6';
    if (c.includes('referral')) return '#8b5cf6';
    return '#94a3b8';
  }
  function deviceIcon(d) {
    if (d === 'mobile')  return '📱';
    if (d === 'desktop') return '🖥';
    if (d === 'tablet')  return '📟';
    return '🔌';
  }
  function prettySource(src) {
    const map = {
      '(direct)': 'typed / bookmark',
      // Meta placement short codes
      'an':  'Audience Network',
      'fb':  'Facebook',
      'ig':  'Instagram',
      'msg': 'Messenger',
      'th':  'Threads',
      // Common domains → friendly names
      'facebook.com':     'Facebook',
      'm.facebook.com':   'Facebook (mobile)',
      'l.facebook.com':   'Facebook',
      'lm.facebook.com':  'Facebook (mobile)',
      'instagram.com':    'Instagram',
      'l.instagram.com':  'Instagram',
      'google':           'Google',
      'bing':             'Bing',
      'duckduckgo.com':   'DuckDuckGo',
      'yahoo':            'Yahoo',
      't.co':             'X / Twitter',
      'linktr.ee':        'Linktree',
      'mailchimp':        'Mailchimp email',
      'youtube.com':      'YouTube',
      'reddit.com':       'Reddit',
      'tiktok.com':       'TikTok',
      'pinterest.com':    'Pinterest',
    };
    return map[src] || map[(src||'').toLowerCase()] || src;
  }

  // ── SVG Donut ──────────────────────────────────────────────────────────────
  function Donut({ pct, color, size=80 }) {
    const r = 30, c = 40, circ = 2*Math.PI*r;
    const dash = (pct/100)*circ;
    return (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}/>
        <text x={c} y={c+1} textAnchor="middle" dominantBaseline="middle"
          fontSize="14" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
    );
  }

  // ── KPI card ───────────────────────────────────────────────────────────────
  function KpiCard({ label, value, sub, accent='#6366f1', pulse=false, delta=null, tooltip=null }) {
    const [tipOpen, setTipOpen] = React.useState(false);
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-1 relative">
        {pulse && realtimeUsers != null && (
          <span className="absolute top-3 right-3 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"/>
            <span className="text-[10px] text-emerald-600 font-semibold">LIVE</span>
          </span>
        )}
        {/* Label row with tooltip trigger */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{label}</span>
          {tooltip && (
            <div className="relative flex-shrink-0" style={{zIndex:20}}>
              <button
                onMouseEnter={() => setTipOpen(true)}
                onMouseLeave={() => setTipOpen(false)}
                onFocus={() => setTipOpen(true)}
                onBlur={() => setTipOpen(false)}
                className="w-3.5 h-3.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 text-[8px] font-bold flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 cursor-help leading-none"
                style={{lineHeight:'14px'}}
              >?</button>
              {tipOpen && (
                <div className="absolute left-0 top-5 w-56 bg-gray-900 text-white text-[11px] rounded-xl p-3 shadow-2xl leading-relaxed" style={{zIndex:100}}>
                  {tooltip}
                  {delta && (
                    <p className="mt-1.5 text-gray-400 text-[10px]">
                      {delta.up ? '▲' : '▼'} {delta.display} vs. the same-length period before this one.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-2xl font-black" style={{color:accent}}>{value}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
          {delta && (
            <span className={`text-[10px] font-bold ${delta.up ? 'text-emerald-500' : 'text-red-400'}`}>
              {delta.up ? '▲' : '▼'} {delta.display}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Mini sparkline ─────────────────────────────────────────────────────────
  function Sparkline({ data=[], color='#6366f1', h=40 }) {
    if (data.length < 2) return null;
    const vals = data.map(d => Number(d.sessions)||0);
    const max = Math.max(...vals,1);
    const W = 200, H = h, pad=2;
    const pts = vals.map((v,i)=>[pad+(i/(vals.length-1))*(W-pad*2), H-pad-(v/max)*(H-pad*2)]);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:h}}>
        <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
        <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.5" fill={color}/>
      </svg>
    );
  }

  if (!isAdmin) return (
    <div className="p-8 text-center text-gray-400 text-sm">Web Analytics is available to admins only.</div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Web Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5 max-w-md italic">
            "The best ideas are the ones that look like common sense after the fact, but before are completely invisible." — GA4 live data
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {/* Date range selector */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
            {[7,30,90].map(d=>(
              <button key={d} onClick={()=>changeDays(d)} disabled={loading}
                className={`px-3 py-1.5 transition-colors disabled:opacity-40 ${days===d ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {d}d
              </button>
            ))}
          </div>
          {lastFetch && <span className="text-[11px] text-gray-400">Updated {lastFetch.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
          <button onClick={()=>fetchAll()} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 disabled:opacity-40 transition-colors border border-indigo-100 dark:border-indigo-800">
            <Ic n="refresh" cls={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/>
            {loading ? 'Fetching…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Live Map ──────────────────────────────────────────────────────── */}
      <LiveMapPanel live={liveData} loading={liveLoading} total={realtimeUsers} cities={data?.cities||[]} days={days}/>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          <strong>GA4 Error:</strong> {error}
          {error.includes('secret') && (
            <p className="mt-2 text-xs">Set your Supabase secret: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">supabase secrets set GA4_SERVICE_ACCOUNT_JSON='…'</code></p>
          )}
        </div>
      )}

      {/* ── Skeleton while loading ─────────────────────────────────────────── */}
      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_,i)=>(
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 h-24 animate-pulse border border-gray-100 dark:border-gray-800">
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-3"/>
              <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-1/2"/>
            </div>
          ))}
        </div>
      )}

      {data && (() => {
        const ov = data.overview || {};
        const prev = data.previous || null;

        // Compute period-over-period deltas
        const pctDelta = (cur, prv) => {
          if (!prv || prv === 0 || cur == null) return null;
          const pct = Math.round(((cur - prv) / prv) * 100);
          return { display: `${Math.abs(pct)}%`, up: pct >= 0 };
        };
        const ppDelta = (cur, prv) => {
          if (!prv || cur == null) return null;
          const pp = Math.round(cur - prv);
          return { display: `${Math.abs(pp)}pp`, up: pp >= 0 };
        };
        const durDelta = (cur, prv) => {
          if (!prv || prv === 0 || cur == null) return null;
          const pct = Math.round(((cur - prv) / prv) * 100);
          return { display: `${Math.abs(pct)}%`, up: pct >= 0 };
        };
        const sessionsDelta    = prev ? pctDelta(ov.sessions, prev.sessions) : null;
        const engagementDelta  = prev ? ppDelta(ov.engagementRate, prev.engagementRate) : null;
        const captivationDelta = prev ? durDelta(ov.avgSessionDuration, prev.avgSessionDuration) : null;

        const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const trend = (data.trend||[]).map(r=>{
          const d=String(r.date||'');
          const label = d.length===8 ? `${MO[parseInt(d.slice(4,6))-1]} ${parseInt(d.slice(6,8))}` : d.slice(4);
          return { date: label, sessions: Number(r.sessions)||0 };
        });
        const sources = data.sources || [];
        const pages   = data.pages   || [];
        const devices = data.devices || [];
        const countries = data.countries || [];
        const cities  = data.cities  || [];
        // Group cities by country for drill-down
        const citiesByCountry = {};
        cities.forEach(c => {
          if (!citiesByCountry[c.country]) citiesByCountry[c.country] = [];
          citiesByCountry[c.country].push(c);
        });
        const maxSrc = Math.max(...sources.map(s=>Number(s.sessions)||0), 1);
        const maxViews = Math.max(...pages.map(p=>Number(p.views)||0), 1);

        return (
          <>
            {/* ── KPI strip ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <KpiCard label="Live Audience" value={realtimeUsers != null ? realtimeUsers : '—'}
                sub="active right now" accent="#10b981" pulse
                tooltip="People on suenos.ca right now. Updates every 30 seconds. It's a live headcount — if it says 8, there are 8 people with your site open at this exact moment."/>
              <KpiCard label="Sessions" value={fmtNum(ov.sessions)}
                sub={`${fmtNum(ov.pageViews)} page views`} accent="#6366f1" delta={sessionsDelta}
                tooltip="How many times people visited your site in this period. One person visiting Monday and again Friday = 2 sessions. Page views is how many individual pages they loaded across all those visits."/>
              <KpiCard label="Genuine Interest" value={`${ov.engagementRate ?? '—'}%`}
                sub="engagement rate" accent="#f59e0b" delta={engagementDelta}
                tooltip="The % of visits where someone actually did something — scrolled, clicked, or stayed more than 10 seconds. The rest left immediately without interacting. 50%+ is strong. The ▲/▼ shows how many percentage points this shifted vs. last period (e.g. ▼ 5pp means it dropped by 5 points)."/>
              <KpiCard label="Captivation" value={fmtDuration(ov.avgSessionDuration)}
                sub="avg session duration" accent="#3b82f6" delta={captivationDelta}
                tooltip="How long people stick around on average per visit. Longer = they're reading, exploring, or watching. Shorter = they left quickly. Even 1–2 minutes is decent for a brand site."/>
              <KpiCard label="Brand Gravity" value={`${ov.directPct ?? '—'}%`}
                sub="direct traffic (sought you out)" accent="#8b5cf6"
                tooltip="The % of visitors who came directly — typed your URL, used a bookmark, or clicked a link in an email or text. These people already know Sueños and actively looked you up. The higher this is, the stronger your brand recognition."/>
            </div>

            {/* ── Trend pulse ─────────────────────────────────────────────── */}
            {(() => {
              const le = days <= 7 ? 1 : days <= 30 ? 5 : 14;
              return (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-bold text-gray-800 dark:text-white text-sm">{days}-Day Pulse</h2>
                      <p className="text-[11px] text-gray-400">Daily sessions over the past {days} days</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-indigo-600">{fmtNum(ov.sessions)}</span>
                      <p className="text-[10px] text-gray-400">total sessions</p>
                    </div>
                  </div>
                  <AreaChart data={trend} xKey="date" yKey="sessions" color="#6366f1" h={140} labelEvery={le}/>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-300">{trend[0]?.date}</span>
                    <span className="text-[10px] text-gray-300">{trend[trend.length-1]?.date}</span>
                  </div>
                </div>
              );
            })()}

            {/* ── New vs Returning + Traffic Sources ───────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* New vs Returning */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Loyal Believers</h2>
                <p className="text-[11px] text-gray-400 mb-4">New vs returning visitors — returning % signals genuine brand gravity</p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <Donut pct={ov.newPct || 0} color="#6366f1" size={90}/>
                    <span className="text-xs text-gray-500">New</span>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Donut pct={ov.retPct || 0} color="#10b981" size={90}/>
                    <span className="text-xs text-gray-500">Returning</span>
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <div>
                      <p className="text-2xl font-black text-emerald-600">{fmtNum(ov.returningUsers)}</p>
                      <p className="text-[11px] text-gray-400">returned to your site</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-indigo-600">{fmtNum(ov.newUsers)}</p>
                      <p className="text-[11px] text-gray-400">discovered you</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traffic Sources */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Discovery Pathways</h2>
                <p className="text-[11px] text-gray-400 mb-3">How people find you — click a channel to see the sources inside it</p>
                <div className="space-y-2.5">
                  {sources.slice(0,7).map((s,i)=>{
                    const detail = (data.sourceDetail || {})[s.channel] || [];
                    const isOpen = expandedChannel === s.channel;
                    const maxDetail = Math.max(...detail.map(d=>d.sessions), 1);
                    return (
                    <div key={i} className="space-y-0.5">
                      <div
                        className={`cursor-pointer rounded-lg -mx-1.5 px-1.5 py-0.5 transition-colors ${isOpen ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                        onClick={() => setExpandedChannel(isOpen ? null : s.channel)}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <svg className={`w-2.5 h-2.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
                            </svg>
                            {s.channel}
                          </span>
                          <div className="flex items-center gap-2 text-gray-400">
                            <span>{s.engagementRate}% engaged</span>
                            <span className="font-semibold text-gray-600 dark:text-gray-200">{fmtNum(Number(s.sessions))}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-0.5">
                          <div className="h-full rounded-full transition-all"
                            style={{width:`${Math.max(2,(Number(s.sessions)/maxSrc)*100)}%`, background: channelColor(s.channel)}}/>
                        </div>
                      </div>
                      {/* Expanded source breakdown */}
                      {isOpen && (
                        <div className="ml-4 pl-3 border-l-2 py-1.5 space-y-1.5" style={{borderColor: channelColor(s.channel)}}>
                          {detail.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">No source breakdown available — redeploy the edge function to enable this</p>
                          ) : detail.map((d,j)=>(
                            <div key={j} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600 dark:text-gray-300 w-28 truncate font-medium" title={d.source}>{prettySource(d.source)}</span>
                              <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{width:`${Math.max(3,(d.sessions/maxDetail)*100)}%`, background: channelColor(s.channel), opacity:0.6}}/>
                              </div>
                              <span className="text-[10px] text-gray-400 w-16 text-right">{d.engagementRate}% eng</span>
                              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-200 w-8 text-right">{fmtNum(d.sessions)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Top Pages ───────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Top Moments</h2>
              <p className="text-[11px] text-gray-400 mb-3">Pages that captured attention — engagement rate shows genuine interest beyond the click</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left py-2 font-semibold">Page</th>
                      <th className="text-right py-2 font-semibold w-20">Views</th>
                      <th className="text-right py-2 font-semibold w-20">Avg Time</th>
                      <th className="text-right py-2 font-semibold w-20">Engaged</th>
                      <th className="py-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.slice(0,10).map((p,i)=>(
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 pr-4">
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[220px]" title={p.path}>
                            {p.title && p.title !== '(not set)' ? p.title : p.path}
                          </p>
                          <p className="text-gray-400 text-[10px] truncate max-w-[220px]">{p.path}</p>
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-gray-300 font-medium">{fmtNum(Number(p.views))}</td>
                        <td className="py-2 text-right text-gray-500">{fmtDuration(Number(p.avgDuration))}</td>
                        <td className="py-2 text-right">
                          <span className={`font-semibold ${Number(p.engagementRate)>=60?'text-emerald-600':Number(p.engagementRate)>=40?'text-amber-500':'text-gray-400'}`}>
                            {p.engagementRate}%
                          </span>
                        </td>
                        <td className="py-2 pl-2">
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400 transition-all"
                              style={{width:`${(Number(p.views)/maxViews)*100}%`}}/>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Devices + Countries ───────────────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* Devices */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Context of Consumption</h2>
                <p className="text-[11px] text-gray-400 mb-4">Where your audience encounters the brand matters as much as what they see</p>
                <div className="space-y-4">
                  {devices.map((d,i)=>{
                    const colors = ['#6366f1','#10b981','#f59e0b','#ef4444'];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{deviceIcon(d.device)}</span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium capitalize text-gray-700 dark:text-gray-300">{d.device}</span>
                            <span className="text-gray-500">{d.pct}% · {fmtNum(Number(d.sessions))} sessions</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${d.pct}%`,background:colors[i%colors.length]}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Countries + Cities */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Territory</h2>
                <p className="text-[11px] text-gray-400 mb-3">Where your brand has gravity — geography reveals where the story is landing</p>
                <div className="space-y-3">
                  {countries.slice(0,8).map((c,i)=>{
                    const ctyCities = (citiesByCountry[c.country]||[]).slice(0,3);
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-center text-gray-400 font-bold">{i+1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-0.5">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{c.country}</span>
                              <span className="text-gray-400">{fmtNum(Number(c.sessions))} · {c.pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-400 transition-all" style={{width:`${c.pct}%`}}/>
                            </div>
                          </div>
                        </div>
                        {ctyCities.length > 0 && (
                          <div className="ml-6 mt-1 flex flex-wrap gap-1.5">
                            {ctyCities.map((city,j)=>(
                              <span key={j} className="text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded px-1.5 py-0.5 text-gray-500 dark:text-gray-400">
                                {city.city} <span className="text-gray-400">{fmtNum(Number(city.sessions))}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Search Console ────────────────────────────────────────────── */}
            <SearchConsoleCard gscData={gscData} gscLoading={gscLoading} gscError={gscError} days={days}/>

            {/* ── Behavioral footer note ────────────────────────────────────── */}
            <div className="text-center py-2">
              <p className="text-[11px] text-gray-300 italic">
                Powered by GA4 · Property {data.propertyId || '422483683'} · Showing last {data.days || days} days · Refreshes every 60s
              </p>
            </div>
          </>
        );
      })()}
    </div>
  );
}
