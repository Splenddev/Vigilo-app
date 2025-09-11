<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-t-secondary mb-4">
      Attendance Breakdown
    </h3>
    <div className="space-y-4">
      {[
        { label: 'Present on Time', color: 'green-400', value: stats.present },
        { label: 'Late Arrivals', color: 'yellow-400', value: stats.late },
        { label: 'Absent', color: 'red-400', value: stats.absent },
      ]}
      <div className="flex items-center gap-5 justify-between">
        <span className="text-slate-350 whitespace-nowrap">
          Present on Time
        </span>
        <div className="flex w-full items-center gap-2">
          <div className="flex-1 glass-strong rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${(stats.present / stats.total) * 100}%`,
              }}
            />
          </div>
          <span className="text-green-400 font-medium">{stats.present}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-350">Late Arrivals</span>
        <div className="flex items-center flex-1 gap-2">
          <div className="w-32 glass-strong rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000 delay-200"
              style={{
                width: `${(stats.late / stats.total) * 100}%`,
              }}
            />
          </div>
          <span className="text-yellow-400 font-medium">{stats.late}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-350">Absent</span>
        <div className="flex items-center gap-2">
          <div className="w-32 glass-strong rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-1000 delay-400"
              style={{
                width: `${(stats.absent / stats.total) * 100}%`,
              }}
            />
          </div>
          <span className="text-red-400 font-medium">{stats.absent}</span>
        </div>
      </div>
    </div>
  </div>
  ;
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-t-secondary mb-4">
      Attendance Methods
    </h3>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-slate-350">QR Code</span>
        <div className="flex items-center gap-2">
          <div className="w-32 glass-strong rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full w-3/4 transition-all duration-1000" />
          </div>
          <span className="text-purple-400 font-medium">32</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-350">Manual Code</span>
        <div className="flex items-center gap-2">
          <div className="w-32 glass-strong rounded-full h-2">
            <div className="bg-cyan-500 h-2 rounded-full w-1/4 transition-all duration-1000 delay-200" />
          </div>
          <span className="text-cyan-400 font-medium">11</span>
        </div>
      </div>
    </div>
  </div>
</div>;
