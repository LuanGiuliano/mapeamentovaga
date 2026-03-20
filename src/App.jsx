import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Upload,
  FileSpreadsheet,
  Download,
  PieChart as PieIcon,
  BarChart2,
  AlertCircle,
  Search,
  Filter,
  School,
  MapPin,
  ClipboardList,
  FileText,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

const COLORS = ['#60a5fa', '#a78bfa', '#fbbf24', '#f87171', '#34d399', '#818cf8'];

export default function App() {
  const [data, setData] = useState([]);
  const [vagasPreenchidas, setVagasPreenchidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState('abertas'); // 'abertas' | 'preenchidas'

  // ---- Auto-load BASEVAGAJAPREENCHIDA.xlsx from public/ on startup ----
  useEffect(() => {
    fetch('/BASEVAGAJAPREENCHIDA.xlsx')
      .then(res => {
        if (!res.ok) throw new Error('Arquivo de vagas preenchidas n\u00e3o encontrado.');
        return res.arrayBuffer();
      })
      .then(buffer => {
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        const cleaned = jsonData.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => { newRow[key.replace(/\n/g, ' ').trim()] = row[key]; });
          return newRow;
        });
        setVagasPreenchidas(cleaned);
      })
      .catch(err => console.warn('Auto-load vagas preenchidas:', err));
  }, []);
  // ------------------------------------------------------------

  // Search and Filter status
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDRE, setFilterDRE] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [viewMode, setViewMode] = useState('detalhado'); // 'detalhado' | 'resumo'

  // Vagas Preenchidas search
  const [searchPreenchidas, setSearchPreenchidas] = useState('');
  const [filterDREPreenchidas, setFilterDREPreenchidas] = useState('');

  const processFile = (file) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) throw new Error("O arquivo está vazio.");

        const cleanedData = jsonData.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const newKey = key.replace(/\n/g, ' ').trim();
            newRow[newKey] = row[key];
          });
          return newRow;
        });

        // Auto-detect file type: if has CONTRATADO column -> vagas preenchidas
        const cols = Object.keys(cleanedData[0] || {});
        if (cols.includes('CONTRATADO')) {
          setVagasPreenchidas(cleanedData);
          setMainTab('preenchidas');
        } else {
          setData(cleanedData);
          setMainTab('abertas');
        }
      } catch (err) {
        setError("Erro ao processar o arquivo: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Erro ao ler o arquivo.");
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Memoized Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesSearch = searchTerm === '' ||
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesDRE = filterDRE === '' || row['DRE'] === filterDRE;
      const matchesActivity = filterActivity === '' || row['ATIVIDADE'] === filterActivity;

      return matchesSearch && matchesDRE && matchesActivity;
    });
  }, [data, searchTerm, filterDRE, filterActivity]);

  const dreList = useMemo(() => [...new Set(data.map(r => r.DRE))].filter(Boolean).sort(), [data]);
  const activityList = useMemo(() => [...new Set(data.map(r => r.ATIVIDADE))].filter(Boolean).sort(), [data]);

  const getDREData = () => {
    const counts = {};
    filteredData.forEach(row => {
      const dre = row['DRE'] || 'Não Definido';
      counts[dre] = (counts[dre] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getCargoData = () => {
    const counts = {};
    filteredData.forEach(row => {
      const cargo = row['ATIVIDADE'] || 'Não Definido';
      counts[cargo] = (counts[cargo] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const getEscolaData = () => {
    const counts = {};
    filteredData.forEach(row => {
      const escola = row['NOME DA ESCOLA'] || 'Não Definido';
      counts[escola] = (counts[escola] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const exportReport = () => {
    const reportData = filteredData.map(row => ({
      'DRE': row['DRE'],
      'ATIVIDADE': row['ATIVIDADE'],
      'LOTAÇÃO': row['NOME DA ESCOLA']
    })).sort((a, b) => {
      if (a.DRE !== b.DRE) return a.DRE.localeCompare(b.DRE);
      return a.ATIVIDADE.localeCompare(b.ATIVIDADE);
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
    XLSX.writeFile(wb, "Relatorio_Mapeamento_Vagas_Urgente.xlsx");
  };

  const exportListaExcel = () => {
    const rows = groupedTableData.map(row => ({
      'DRE': row['DRE'],
      'Cargo/Atividade': row['ATIVIDADE'],
      'LOTAÇÃO': row['NOME DA ESCOLA'],
      'Qtd Vagas': row.count
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista Detalhada");
    XLSX.writeFile(wb, "Lista_Detalhada_Vagas.xlsx");
  };

  const exportListaPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Lista Detalhada de Vagas - SEDUC', 14, 15);
    doc.setFontSize(9);
    doc.text(`Total de ${filteredData.length} vagas agrupadas em ${groupedTableData.length} registros`, 14, 22);
    autoTable(doc, {
      startY: 27,
      head: [['DRE', 'Cargo/Atividade', 'LOTAÇÃO', 'Qtd Vagas']],
      body: groupedTableData.map(row => [
        row['DRE'] || '',
        row['ATIVIDADE'] || '',
        row['NOME DA ESCOLA'] || '',
        row.count
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    doc.save('Lista_Detalhada_Vagas.pdf');
  };

  const dreDataArr = getDREData();
  const cargoDataArr = getCargoData();
  const escolaDataArr = getEscolaData();

  // Grouped Data for Table (Excluding Date)
  const groupedTableData = useMemo(() => {
    const groups = {};
    filteredData.forEach(row => {
      const key = `${row['DRE']}|${row['ATIVIDADE']}|${row['NOME DA ESCOLA']}`;
      if (!groups[key]) {
        groups[key] = { ...row, count: 0 };
      }
      groups[key].count += 1;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Grouped by DRE + ATIVIDADE only (summary view)
  const summaryTableData = useMemo(() => {
    const groups = {};
    filteredData.forEach(row => {
      const key = `${row['DRE']}|${row['ATIVIDADE']}`;
      if (!groups[key]) {
        groups[key] = { DRE: row['DRE'], ATIVIDADE: row['ATIVIDADE'], count: 0 };
      }
      groups[key].count += 1;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Metrics
  const totalVagas = filteredData.length;
  const uniqueEscolas = new Set(filteredData.map(r => r['NOME DA ESCOLA'])).size;
  const uniqueDREs = new Set(filteredData.map(r => r['DRE'])).size;

  // Vagas Preenchidas - filtered
  const filteredPreenchidas = useMemo(() => {
    return vagasPreenchidas.filter(row => {
      const matchesSearch = searchPreenchidas === '' ||
        Object.values(row).some(val => String(val).toLowerCase().includes(searchPreenchidas.toLowerCase()));
      const matchesDRE = filterDREPreenchidas === '' || row['DRE'] === filterDREPreenchidas;
      return matchesSearch && matchesDRE;
    });
  }, [vagasPreenchidas, searchPreenchidas, filterDREPreenchidas]);

  const dreListPreenchidas = useMemo(() => [...new Set(vagasPreenchidas.map(r => r.DRE))].filter(Boolean).sort(), [vagasPreenchidas]);

  const exportPreenchibasExcel = () => {
    const rows = filteredPreenchidas.map(row => ({
      'DRE': row['DRE'],
      'Cargo': row['ATIVIDADE'] || row['NOME DO CARGO'],
      'Servidor Anterior': row['SERVIDOR'],
      'Candidato Contratado': row['CONTRATADO'],
      'Categoria': row['CATEGORIA'],
      'Publicação DOE': row['DATA DE PUBLICAÇÃO DO DOE'],
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vagas Preenchidas');
    XLSX.writeFile(wb, 'Vagas_Preenchidas.xlsx');
  };

  return (
    <div className="animate-fade-in">
      <header>
        <div>
          <h1>MAPEAMENTO DE VAGAS</h1>
          <p className="subtitle">Visualização analítica da rede estadual (SEDUC)</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {data.length > 0 && (
            <button className="btn btn-primary" onClick={exportReport}>
              <Download size={20} /> Exportar Filtrados
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent)', marginBottom: '2rem', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertCircle color="#f87171" size={24} />
            <span style={{ color: '#f87171' }}>{error}</span>
          </div>
        </div>
      )}

      {data.length === 0 && vagasPreenchidas.length === 0 ? (
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', padding: '3rem', alignItems: 'center' }}>
          {/* Upload BASEPRINCIPAL */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', border: '1px dashed var(--border)', borderRadius: '1rem', textAlign: 'center' }}>
            <ClipboardList size={48} color="var(--primary)" style={{ opacity: 0.6 }} />
            <div>
              <h3>Vagas em Aberto</h3>
              <p className="subtitle" style={{ marginTop: '0.5rem' }}>Carregue o arquivo BASEPRINCIPAL.xlsx</p>
            </div>
            <label className="btn btn-upload">
              <FileSpreadsheet size={18} /> Selecionar
              <input type="file" accept=".xlsx, .xls, .csv" onChange={onFileChange} style={{ display: 'none' }} />
            </label>
          </div>
          {/* Upload Preenchidas */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', border: '1px dashed rgba(16,185,129,0.4)', borderRadius: '1rem', textAlign: 'center' }}>
            <CheckCircle2 size={48} color="var(--success)" style={{ opacity: 0.6 }} />
            <div>
              <h3 style={{ color: 'var(--success)' }}>Vagas Preenchidas</h3>
              <p className="subtitle" style={{ marginTop: '0.5rem' }}>Carregue o arquivo BASEVAGAJAPREENCHIDA.xlsx</p>
            </div>
            <label className="btn btn-upload" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              <FileSpreadsheet size={18} /> Selecionar
              <input type="file" accept=".xlsx, .xls, .csv" onChange={onFileChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      ) : (
        <>
          {/* Main tab navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
            <button
              onClick={() => setMainTab('abertas')}
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', background: 'none', border: 'none', cursor: 'pointer', color: mainTab === 'abertas' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: mainTab === 'abertas' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: mainTab === 'abertas' ? 700 : 400 }}
            >
              <ClipboardList size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Vagas em Aberto {data.length > 0 && <span style={{ background: 'rgba(37,99,235,0.2)', padding: '0 0.4rem', borderRadius: '1rem', fontSize: '0.75rem', marginLeft: '0.3rem' }}>{data.length}</span>}
            </button>
            <button
              onClick={() => setMainTab('preenchidas')}
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', background: 'none', border: 'none', cursor: 'pointer', color: mainTab === 'preenchidas' ? 'var(--success)' : 'var(--text-muted)', borderBottom: mainTab === 'preenchidas' ? '2px solid var(--success)' : '2px solid transparent', fontWeight: mainTab === 'preenchidas' ? 700 : 400 }}
            >
              <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Vagas Preenchidas {vagasPreenchidas.length > 0 && <span style={{ background: 'rgba(16,185,129,0.2)', padding: '0 0.4rem', borderRadius: '1rem', fontSize: '0.75rem', marginLeft: '0.3rem' }}>{vagasPreenchidas.length}</span>}
            </button>
            {/* Upload additional file button */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label className="btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }} title="Carregar outro arquivo">
                <Upload size={14} /> Adicionar arquivo
                <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {mainTab === 'preenchidas' ? (
            <>
              {vagasPreenchidas.length === 0 ? (
                <div className="glass-card empty-state">
                  <CheckCircle2 size={64} color="var(--success)" style={{ opacity: 0.5 }} />
                  <div>
                    <h2>Nenhuma vaga preenchida carregada</h2>
                    <p className="subtitle" style={{ marginTop: '0.5rem' }}>Carregue o arquivo BASEVAGAJAPREENCHIDA.xlsx</p>
                  </div>
                  <label className="btn btn-upload" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                    <FileSpreadsheet size={20} /> Selecionar Arquivo
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={onFileChange} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <>
                  {/* Preenchidas Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '1rem' }}><CheckCircle2 color="var(--success)" size={32} /></div>
                      <div><p className="subtitle">Vagas Preenchidas</p><h2 style={{ fontSize: '2rem' }}>{filteredPreenchidas.length}</h2></div>
                    </div>
                    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ background: 'rgba(167, 139, 250, 0.2)', padding: '1rem', borderRadius: '1rem' }}><UserCheck color="var(--accent)" size={32} /></div>
                      <div><p className="subtitle">Candidatos Convocados</p><h2 style={{ fontSize: '2rem' }}>{new Set(filteredPreenchidas.map(r => r['CONTRATADO'])).size}</h2></div>
                    </div>
                    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ background: 'rgba(37, 99, 235, 0.2)', padding: '1rem', borderRadius: '1rem' }}><MapPin color="var(--primary)" size={32} /></div>
                      <div><p className="subtitle">DREs Abrangidas</p><h2 style={{ fontSize: '2rem' }}>{new Set(filteredPreenchidas.map(r => r['DRE'])).size}</h2></div>
                    </div>
                  </div>

                  {/* Preenchidas filters */}
                  <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Pesquisar candidato, cargo, DRE..." value={searchPreenchidas} onChange={e => setSearchPreenchidas(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Filter size={18} color="var(--text-muted)" />
                        <select value={filterDREPreenchidas} onChange={e => setFilterDREPreenchidas(e.target.value)}
                          style={{ background: '#1e293b', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                          <option value="">Todas DREs</option>
                          {dreListPreenchidas.map(dre => <option key={dre} value={dre}>{dre}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={exportPreenchibasExcel} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                          <Download size={16} /> Excel
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preenchidas Table */}
                  <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                        <CheckCircle2 size={20} color="var(--success)" />
                      </div>
                      <h3 style={{ fontSize: '1.25rem' }}>Candidatos com Convocação Confirmada</h3>
                      <span className="subtitle" style={{ marginTop: '0.1rem' }}>{filteredPreenchidas.length} registros</span>
                    </div>
                    <div className="data-table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>DRE</th>
                            <th>Cargo / Atividade</th>
                            <th>Candidato (CONTRATADO)</th>
                            <th>Servidor Anterior</th>
                            <th>Categoria</th>
                            <th>Publicação DOE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPreenchidas.slice(0, 100).map((row, i) => (
                            <tr key={i}>
                              <td><span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>{row['DRE']}</span></td>
                              <td>{row['ATIVIDADE'] || row['NOME DO CARGO']}</td>
                              <td style={{ fontWeight: 600, color: '#fff' }}>{row['CONTRATADO']}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row['SERVIDOR']}</td>
                              <td style={{ fontSize: '0.85rem' }}>{row['CATEGORIA']}</td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row['DATA DE PUBLICAÇÃO DO DOE'] ? new Date(Math.round((row['DATA DE PUBLICAÇÃO DO DOE'] - 25569) * 86400 * 1000)).toLocaleDateString('pt-BR') : '-'}</td>
                            </tr>
                          ))}
                          {filteredPreenchidas.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum resultado encontrado.</td></tr>
                          )}
                          {filteredPreenchidas.length > 100 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>Mostrando 100 de {filteredPreenchidas.length}. Use a exportação Excel para ver todos.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
          {/* Filters and Search Bar */}
          <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
            <div className="filters-container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Pesquisar lotação, DRE, vaga..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    color: 'var(--text)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Filter size={18} color="var(--text-muted)" />
                <select
                  value={filterDRE}
                  onChange={(e) => setFilterDRE(e.target.value)}
                  style={{ background: '#1e293b', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '0.5rem' }}
                >
                  <option value="">Todas DREs</option>
                  {dreList.map(dre => <option key={dre} value={dre}>{dre}</option>)}
                </select>
                <select
                  value={filterActivity}
                  onChange={(e) => setFilterActivity(e.target.value)}
                  style={{ background: '#1e293b', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '0.5rem' }}
                >
                  <option value="">Todas Atividades</option>
                  {activityList.map(act => <option key={act} value={act}>{act}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Metrics Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(37, 99, 235, 0.2)', padding: '1rem', borderRadius: '1rem' }}>
                <ClipboardList color="var(--primary)" size={32} />
              </div>
              <div>
                <p className="subtitle">Total de Vagas</p>
                <h2 style={{ fontSize: '2rem' }}>{totalVagas}</h2>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(167, 139, 250, 0.2)', padding: '1rem', borderRadius: '1rem' }}>
                <School color="var(--accent)" size={32} />
              </div>
              <div>
                <p className="subtitle">Lotações</p>
                <h2 style={{ fontSize: '2rem' }}>{uniqueEscolas}</h2>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '1rem' }}>
                <MapPin color="var(--success)" size={32} />
              </div>
              <div>
                <p className="subtitle">DREs Ativas</p>
                <h2 style={{ fontSize: '2rem' }}>{uniqueDREs}</h2>
              </div>
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <PieIcon size={24} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem' }}>Vagas por DRE</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={dreDataArr} margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {dreDataArr.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <School size={24} color="var(--success)" />
                <h3 style={{ fontSize: '1.25rem' }}>Top 10 Lotações</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={escolaDataArr} margin={{ left: 60, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={9} width={150} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="var(--success)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <BarChart2 size={24} color="var(--accent)" />
                <h3 style={{ fontSize: '1.25rem' }}>Distribuição por Cargo (Top 10)</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cargoDataArr}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tick={{ fill: 'var(--text-muted)' }} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                      {cargoDataArr.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                  <ClipboardList size={20} color="var(--success)" />
                </div>
                <h3 style={{ fontSize: '1.25rem' }}>Lista Detalhada de Vagas</h3>
                <span className="subtitle" style={{ marginTop: '0.1rem' }}>{filteredData.length} vagas</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* View toggle */}
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <button
                    onClick={() => setViewMode('detalhado')}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: viewMode === 'detalhado' ? 'var(--primary)' : 'transparent', color: viewMode === 'detalhado' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                  >
                    Detalhado
                  </button>
                  <button
                    onClick={() => setViewMode('resumo')}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: viewMode === 'resumo' ? 'var(--primary)' : 'transparent', color: viewMode === 'resumo' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                  >
                    Por DRE/Profissão
                  </button>
                </div>
                {/* Export buttons */}
                <button className="btn btn-primary" onClick={exportListaExcel} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <Download size={16} /> Excel
                </button>
                <button className="btn" onClick={exportListaPDF} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <FileText size={16} /> PDF
                </button>
              </div>
            </div>

            {viewMode === 'detalhado' ? (
              <div className="data-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>DRE</th>
                      <th>Cargo/Atividade</th>
                      <th>LOTAÇÃO</th>
                      <th>Qtd Vagas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedTableData.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        <td><span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{row['DRE']}</span></td>
                        <td>{row['ATIVIDADE']}</td>
                        <td style={{ fontWeight: 500 }}>{row['NOME DA ESCOLA']}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.count}</td>
                      </tr>
                    ))}
                    {groupedTableData.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum resultado encontrado.</td></tr>
                    )}
                    {groupedTableData.length > 50 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>Mostrando os primeiros 50 grupos de {groupedTableData.length}. Use os botões de exportação acima para ver todos os registros.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="data-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>DRE</th>
                      <th>Profissão / Cargo</th>
                      <th>Qtd Vagas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryTableData.map((row, i) => (
                      <tr key={i}>
                        <td><span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{row['DRE']}</span></td>
                        <td>{row['ATIVIDADE']}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.count}</td>
                      </tr>
                    ))}
                    {summaryTableData.length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum resultado encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
}
