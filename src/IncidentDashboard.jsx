import React, { useEffect, useState } from 'react';
import './IncidentDashboard.css';

const IncidentDashboard = ({ incident: incidentProp }) => {
  const [incident, setIncident] = useState(incidentProp || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showModal, setShowModal] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [latestError, setLatestError] = useState(null);

  useEffect(() => {
    if (incidentProp) setIncident(incidentProp);
  }, [incidentProp]);

  useEffect(() => {
    if (incidentProp) return;
    const candidates = ['/AngelOps/data.json', '/data.json', './data.json'];
    let cancelled = false;
    (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
          if (!res.ok) continue;
          const json = await res.json();
          if (!cancelled) {
            setIncident(json);
            const errs = json?.error_analyzer_output?.dashboard_ready?.top_errors;
            if (errs && errs.length > 0) setLatestError(errs[0]['@message']);
          }
          break;
        } catch (e) { continue; }
      }
    })();
    return () => { cancelled = true; };
  }, [incidentProp]);

  const manualRefresh = async () => {
    const candidates = ['/AngelOps/data.json', '/data.json', './data.json'];
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const json = await res.json();
        setIncident(json);
        const errs = json?.error_analyzer_output?.dashboard_ready?.top_errors;
        if (errs && errs.length > 0) setLatestError(errs[0]['@message']);
        return;
      } catch (e) { continue; }
    }
    window.location.reload();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleRollback = () => setShowModal(true);
  const confirmRollback = () => {
    setShowModal(false);
    alert('Rollback initiated successfully!');
  };

  const errorData = incident?.error_analyzer_output?.dashboard_ready?.error_timeline || [];
  const topErrors = incident?.error_analyzer_output?.dashboard_ready?.top_errors || [];
  const fileImpact = incident?.error_analyzer_output?.dashboard_ready?.file_impact || {};
  const deploy = incident?.error_analyzer_output?.dashboard_ready?.deployment_info || {};
  const stats = incident?.error_analyzer_output?.basic_stats || {};
  const status = incident?.status?.toLowerCase() || 'unknown';

  const renderChart = () => {
  if (!errorData.length) return <p>No chart data.</p>;

  const width = 600;
  const height = 240;
  const padding = 50;
  const maxVal = Math.max(...errorData.map(d => d[1])) || 1;

  const points = errorData.map((d, i) => ({
    label: d[0],
    x: padding + (i / (errorData.length - 1)) * (width - 2 * padding),
    y: height - padding - (d[1] / maxVal) * (height - 2 * padding),
    value: d[1]
  }));

  const path = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
  ).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="260">
      {/* Gridlines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padding + (i / 4) * (height - 2 * padding);
        return (
          <line
            key={i}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke={theme === 'dark' ? '#2d3748' : '#e5e7eb'}
            strokeWidth="0.5"
          />
        );
      })}

      {/* X and Y axes */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
        strokeWidth="1"
      />
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
        strokeWidth="1"
      />

      {/* Data line */}
      <path d={path} fill="none" stroke="#ff9900" strokeWidth="3" />

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ff9900" />
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text
          key={`x-${i}`}
          x={p.x}
          y={height - padding + 20}
          fontSize="10"
          textAnchor="middle"
          fill={theme === 'dark' ? '#f9fafb' : '#374151'}
        >
          {p.label.split(' ')[1]}
        </text>
      ))}

      {/* Y-axis labels */}
      {[0, ...Array.from({ length: 4 }, (_, i) => Math.round(maxVal * ((i + 1) / 4)))].map((val, i) => (
        <text
          key={`y-${i}`}
          x={padding - 30}
          y={height - padding - (val / maxVal) * (height - 2 * padding)}
          fontSize="10"
          textAnchor="end"
          fill={theme === 'dark' ? '#f9fafb' : '#6b7280'}
        >
          {val}
        </text>
      ))}

      {/* Axis titles */}
      <text
        x={width / 2}
        y={height - 10}
        textAnchor="middle"
        fontSize="12"
        fill={theme === 'dark' ? '#f9fafb' : '#374151'}
      >
        Time (HH:MM)
      </text>
      <text
        x="15"
        y={height / 2}
        textAnchor="middle"
        fontSize="12"
        fill={theme === 'dark' ? '#f9fafb' : '#374151'}
        transform={`rotate(-90, 15, ${height / 2})`}
      >
        Error Count
      </text>
    </svg>
  );
};

  const getStatusColor = () => {
    if (status.includes('healthy') || status.includes('ok')) return '#10b981';
    if (status.includes('degraded')) return '#f59e0b';
    if (status.includes('down') || status.includes('error')) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className={`dashboard ${theme}`}>
      <header className="dashboard-header">
        <h1>AWS Incident Response</h1>
        <div className="header-controls">
          <span className="status">
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(),
                marginRight: '8px',
                verticalAlign: 'middle'
              }}
            ></span>
            Service Status: {incident?.status || 'Unknown'}
          </span>
          <button className="refresh-btn" onClick={manualRefresh}>🔄 Refresh</button>
          <button className="refresh-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button className="refresh-btn" onClick={() => window.open('https://github.com/edrickchang13/DevAngel', '_blank')}>
            💻 View Repo
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="chart-section card">
          <h2>Error Timeline</h2>
          {renderChart()}
          <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1rem' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </section>

        <section className="service-health card">
          <h2>File Impact</h2>
          <table>
            <thead><tr><th>File</th><th>Error Count</th></tr></thead>
            <tbody>
              {Object.entries(fileImpact).map(([file, count], i) => (
                <tr key={i}><td>{file}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Combined Summary + Error Insights */}
        <section className="summary-column">
          <div className="analysis-summary card">
            <h2>Summary</h2>
            <p><strong>Total Errors:</strong> {stats.total_errors}</p>
            <p><strong>Unique Exemplars:</strong> {stats.unique_exemplars}</p>
            <p><strong>Deploy SHA:</strong> {stats.deploy_sha}</p>
            <p><strong>Deploy Message:</strong> {stats.deploy_message}</p>
          </div>

          <div className="error-insights card">
            <h2>Error Insights</h2>
            {topErrors.length > 0 ? (
              <ul>
                {topErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>
                    <strong>{err['@timestamp'].split('T')[1].slice(0,5)}</strong> — 
                    {err['@message'].split(' ').slice(0, 8).join(' ')}...
                  </li>
                ))}
              </ul>
            ) : (
              <p>No insights available.</p>
            )}
          </div>
        </section>

        <section className="incident-timeline card">
          <h2>Top Errors</h2>
          <ul>
            {topErrors.map((err, i) => (
              <li key={i}>
                <strong>{err['@timestamp']}</strong>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.85rem',
                  background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
                  padding: '0.5rem',
                  borderRadius: '6px'
                }}>
                  {err['@message']}
                </pre>
              </li>
            ))}
          </ul>
        </section>

        <section className="real-time-metrics card">
          <h2>Deployment Info</h2>
          {deploy ? (
            <ul>
              <li><strong>Commit SHA:</strong> {deploy.sha}</li>
              <li><strong>Message:</strong> {deploy.message}</li>
              <li><strong>Timestamp:</strong> {deploy.timestamp}</li>
              <li><strong>Changed Files:</strong></li>
              <ul>
                {deploy.changed_files?.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </ul>
          ) : (
            <p>No deployment info available.</p>
          )}
        </section>
      </main>

      <footer>
        <a href={incident?.prLink} target="_blank" rel="noopener noreferrer">View GitHub PR</a>
        <button onClick={handleRollback}>Initiate Rollback</button>
      </footer>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Rollback</h3>
            <p>Are you sure you want to rollback the last deployment?</p>
            <div className="modal-actions">
              <button onClick={confirmRollback}>Yes, Rollback</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup above footer */}
      {latestError && (
        <div
          style={{
            position: 'fixed',
            bottom: '65px',
            left: 0,
            right: 0,
            background: '#b91c1c',
            color: 'white',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: '600',
            zIndex: 100,
            borderTop: '1px solid #7f1d1d'
          }}
        >
          ⚠️ Latest Error: {latestError}
        </div>
      )}
    </div>
  );
};

export default IncidentDashboard;