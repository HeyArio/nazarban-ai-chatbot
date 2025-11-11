document.addEventListener('DOMContentLoaded', () => {
  const chartsContainer = document.getElementById('charts-container');
  const lastUpdatedEl = document.getElementById('last-updated');

  function showLoading() {
    chartsContainer.innerHTML = `
      <div class="loader-container">
        <div class="loader"></div>
        <p data-lang-key="benchmark_loading">Loading benchmark data...</p>
      </div>
    `;
  }

  function showError(message) {
    chartsContainer.innerHTML = `
      <div class="error-message">
        <strong data-lang-key="benchmark_error_title">Error loading benchmarks:</strong> ${message}
      </div>
    `;
    lastUpdatedEl.innerHTML = `<span data-lang-key="benchmark_data_error">Could not load data.</span>`;
  }

  function renderData(data) {
    // Get current language for translations
    const lang = localStorage.getItem('preferredLanguage') || 'fa';
    const t = window.translations && window.translations[lang] ? window.translations[lang] : window.translations.fa;
    
    // Clear the loader
    chartsContainer.innerHTML = `
      <div id="hero-stats-container" class="hero-stats-grid"></div>
      <div class="charts-grid">
        <div class="chart-card">
          <h2 data-lang-key="benchmark_chart_top10_fallback">${data.charts?.top_10_bar?.title || t.benchmark_chart_top10_fallback}</h2>
          <div id="top-10-bar-chart"></div>
        </div>
        <div class="chart-card">
          <h2 data-lang-key="benchmark_chart_top5_fallback">${data.charts?.top_5_radar?.title || t.benchmark_chart_top5_fallback}</h2>
          <div id="model-comparison-chart"></div>
        </div>
        <div class="chart-card">
          <h2 data-lang-key="benchmark_chart_champions">Category Champions</h2>
          <div id="category-winners-chart"></div>
        </div>
        <div class="chart-card">
          <h2 data-lang-key="benchmark_chart_provider_fallback">${data.charts?.provider_pie?.title || t.benchmark_chart_provider_fallback}</h2>
          <div id="provider-pie-chart"></div>
        </div>
      </div>
      <div id="leaderboard-container" class="leaderboard-container">
         <h2 data-lang-key="benchmark_table_title">Leaderboard</h2>
         <table class="leaderboard-table" id="leaderboard-table"></table>
      </div>
      <div id="insights-container" class="insights-grid"></div>
    `;
    
    // Date formatting
    try {
      const updatedDate = new Date(data.metadata.last_updated);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const lang = localStorage.getItem('preferredLanguage') || 'fa'; 
      const formattedDate = updatedDate.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', options);
      lastUpdatedEl.innerHTML = `<span data-lang-key="benchmark_updated_prefix">Updated:</span> ${formattedDate}`;
    } catch (e) {
      lastUpdatedEl.textContent = `Data loaded.`;
    }

    // Render all the new content
    renderHeroStats(data.hero_stats);
    renderTop10BarChart(data.charts.top_10_bar);
    renderTop5ComparisonChart(data.charts.top_5_radar);
    renderCategoryWinners(data.category_winners); 
    renderProviderPie(data.charts.provider_pie);
    renderLeaderboardTable(data.leaderboard); 
    renderInsights(data); 
    
    // Call the global translation function from language.js
    if (typeof window.updateContent === 'function') {
        window.updateContent();
    } else {
        console.error("language.js has not loaded window.updateContent() yet.");
    }
  }

  function renderHeroStats(stats) {
    if (!stats) return;
    const container = document.getElementById('hero-stats-container');
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-title" data-lang-key="benchmark_hero_top_model">Top Model</div>
        <div class="stat-card-value">${stats.top_model || 'N/A'}</div>
        <div class="stat-card-sub"><span data-lang-key="benchmark_hero_score_label">Score:</span> ${stats.highest_score || '0'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title" data-lang-key="benchmark_hero_models">Models Analyzed</div>
        <div class="stat-card-value">${stats.total_models || '0'}</div>
        <div class="stat-card-sub">${stats.providers_count || '0'} <span data-lang-key="benchmark_hero_providers_label">Providers</span></div>
      </div>
    `;
  }

  // *** UPDATED: Renders the Horizontal Bar Chart ***
  function renderTop10BarChart(chartData) {
    if (!chartData) return;

    const options = {
      series: chartData.datasets.map(dataset => ({
        name: dataset.label,
        data: dataset.data
      })), 
      chart: {
        type: 'bar',
        height: 450, 
        fontFamily: '"Nunito Sans", sans-serif',
        toolbar: { show: false },
        id: 'top10bar', 
        group: 'llm-sync' 
      },
      theme: {
        mode: 'dark' 
      },
      grid: {
        borderColor: '#334155',
        xaxis: { lines: { show: true } }, 
        yaxis: { lines: { show: false } }
      },
      plotOptions: {
        bar: {
          horizontal: true, // <-- Correct
          borderRadius: 4
        },
      },
      dataLabels: { enabled: false },
      
      // *** THE FIX ***
      xaxis: { 
        categories: chartData.labels, // <-- Labels are correctly in xaxis
        labels: {
          style: { colors: '#94A3B8' }
        }
      },
      yaxis: { 
        // 'categories' property is removed
        labels: {
          style: { colors: '#E2E8F0', fontSize: '14px' } 
        }
      },
      // *** END FIX ***
      
      fill: { opacity: 1 }
    };

    const chart = new ApexCharts(document.querySelector("#top-10-bar-chart"), options);
    chart.render();
  }

  // Renders the Top 5 Grouped Bar Chart
  function renderTop5ComparisonChart(chartData) {
    if (!chartData) return;
    const seriesData = chartData.datasets.map(dataset => ({ name: dataset.label, data: dataset.data }));
    const options = {
      series: seriesData,
      chart: { type: 'bar', height: 400, fontFamily: '"Nunito Sans", sans-serif', toolbar: { show: false }, id: 'top5compare', group: 'llm-sync' },
      theme: { mode: 'dark' },
      grid: { borderColor: '#334155' },
      plotOptions: { bar: { horizontal: false, columnWidth: '80%' } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: chartData.labels, labels: { style: { colors: '#E2E8F0', fontSize: '14px' } } },
      yaxis: { labels: { style: { colors: '#94A3B8' } } },
      fill: { opacity: 1 },
      legend: { position: 'top', offsetY: 0, labels: { colors: '#F1F5F9' } }
    };
    new ApexCharts(document.querySelector("#model-comparison-chart"), options).render();
  }

  // Renders the Horizontal Bar Chart
  function renderCategoryWinners(categoryData) {
    if (!categoryData || !Array.isArray(categoryData)) return;
    const series = [{ name: 'Score', data: categoryData.map(item => item.score) }];
    const categories = categoryData.map(item => `${item.display_name}: ${item.model_name}`);
    const options = {
      series: series,
      chart: { type: 'bar', height: 350, fontFamily: '"Nunito Sans", sans-serif', toolbar: { show: false } },
      theme: { mode: 'dark' },
      grid: { borderColor: '#334155' },
      plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4 } },
      dataLabels: { enabled: true, style: { colors: ['#fff'] }, formatter: (val, opts) => categoryData[opts.dataPointIndex].provider, offsetX: -10 },
      xaxis: { categories: categories, labels: { style: { colors: '#94A3B8' } } },
      yaxis: { labels: { style: { colors: '#94A3B8', fontSize: '14px' } } },
      legend: { show: false } 
    };
    new ApexCharts(document.querySelector("#category-winners-chart"), options).render();
  }

  // Renders the Pie Chart
  function renderProviderPie(chartData) {
    if (!chartData) return;
    
    const lang = localStorage.getItem('preferredLanguage') || 'fa';
    
    // This is now SAFE because translations.js is guaranteed to be loaded
    const totalLabel = (window.translations && window.translations[lang] && window.translations[lang]['benchmark_pie_total']) 
                       ? window.translations[lang]['benchmark_pie_total'] : 'Providers';

    const options = {
      series: chartData.datasets[0].data,
      labels: chartData.labels,
      chart: { type: 'donut', height: 400, fontFamily: '"Nunito Sans", sans-serif' },
      theme: { mode: 'dark' },
      plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: totalLabel, color: '#94A3B8' } } } } },
      tooltip: { y: { formatter: (val) => (val === 1 ? "1 model" : val + " models"), title: { formatter: (seriesName) => seriesName } } },
      legend: { position: 'bottom', labels: { colors: '#F1F5F9' }, itemMargin: { horizontal: 5, vertical: 2 } },
      dataLabels: { enabled: false },
      responsive: [{
        breakpoint: 480, 
        options: {
          chart: { height: 300 },
          legend: { show: false },
          plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: totalLabel, fontSize: '18px' } } } } }
        }
      }]
    };
    new ApexCharts(document.querySelector("#provider-pie-chart"), options).render();
  }

  // Renders the Leaderboard Table
  function renderLeaderboardTable(leaderboardData) {
    if (!leaderboardData || !Array.isArray(leaderboardData)) return;
    const table = document.getElementById('leaderboard-table');
    let headerHTML = `
        <thead>
            <tr>
                <th data-lang-key="benchmark_table_rank">Rank</th>
                <th data-lang-key="benchmark_table_name">Model</th>
                <th data-lang-key="benchmark_table_provider">Provider</th>
                <th data-lang-key="benchmark_table_intelligence">Intelligence</th>
                <th data-lang-key="benchmark_table_coding">Coding</th>
                <th data-lang-key="benchmark_table_math">Math</th>
                <th data-lang-key="benchmark_table_grade">Grade</th>
            </tr>
        </thead>
    `;
    let bodyHTML = '<tbody>';
    for (const model of leaderboardData) {
      bodyHTML += `
        <tr>
          <td class="rank">#${model.rank}</td>
          <td>${model.name}</td>
          <td>${model.provider}</td>
          <td>${model.intelligence}</td>
          <td>${model.coding}</td>
          <td>${model.math}</td>
          <td><span class="grade-c">${model.grade}</span></td>
        </tr>
      `;
    }
    bodyHTML += '</tbody>';
    table.innerHTML = headerHTML + bodyHTML;
  }
  
  // Renders Insights and Quick Facts
  function renderInsights(data) {
    const container = document.getElementById('insights-container');
    if (!container) return;
    const insights = data.insights || [];
    const staticFacts = data.quick_facts || []; 
    let insightsHTML = '';
    if (insights.length > 0) {
        for (const item of insights) {
            let typeKey = '';
            if (item.type === 'hidden_gem') {
                typeKey = 'benchmark_insights_hidden';
            } else if (item.type === 'specialist') {
                typeKey = 'benchmark_insights_specialist';
            } else {
                typeKey = 'benchmark_insights_' + item.type;
            }
            insightsHTML += `
                <div class="insight-card">
                    <h3 data-lang-key="${typeKey}">${item.type}</h3>
                    <h4>${item.title}</h4>
                    <p>${item.description}</p>
                </div>
            `;
        }
    }
    let factsHTML = '';
    if (staticFacts.length > 0) {
        factsHTML = `
            <div class="quick-facts-card">
                <h3 data-lang-key="benchmark_facts_title">Quick Facts</h3> 
                <ul>
                    ${staticFacts.map(fact => `<li>${fact}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    container.innerHTML = insightsHTML + factsHTML;
  }
  
  async function fetchBenchmarkData() {
    showLoading();
    try {
      const response = await fetch('/api/benchmark/data');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success && result.data && typeof result.data === 'object') {
        console.log("Successfully fetched data:", result.data); 
        if (!result.data.charts || !result.data.leaderboard) {
          console.error("Data is missing 'charts' or 'leaderboard' key.", result.data);
          throw new Error("Data loaded, but it's missing key sections.");
        }
        renderData(result.data);
      } else {
        throw new Error(result.message || 'Data format is incorrect or empty.');
      }
    } catch (error) {
      console.error('Error fetching/rendering benchmark data:', error);
      showError(error.message);
    }
  }

  fetchBenchmarkData();
});