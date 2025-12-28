import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Composant universel pour afficher des graphiques Recharts
 * Supporte: line, bar, pie, area
 */
const ChartRenderer = ({ chartType, chartTitle, chartData, chartConfig }) => {
  // Tooltip personnalisé avec style Material-UI
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            backgroundColor: 'white',
            border: '1px solid',
            borderColor: 'grey.300',
          }}
        >
          {label && (
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {label}
            </Typography>
          )}
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="caption"
              sx={{
                display: 'block',
                color: entry.color,
                fontSize: '0.75rem',
              }}
            >
              {entry.name}: {formatValue(entry.value, entry.dataKey)}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Formateur de valeurs avec localisation française
  const formatValue = (value, dataKey) => {
    if (value === null || value === undefined) return 'N/A';

    // Si c'est un montant monétaire (revenue, expenses, total, etc.)
    if (
      dataKey &&
      (dataKey.includes('revenue') ||
        dataKey.includes('total') ||
        dataKey.includes('amount') ||
        dataKey.includes('expenses'))
    ) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(value);
    }

    // Si c'est un nombre
    if (typeof value === 'number') {
      return new Intl.NumberFormat('fr-FR').format(value);
    }

    return value;
  };

  // Formateur pour les axes
  const formatAxisTick = (value, dataKey) => {
    if (typeof value === 'number' && value > 1000) {
      return new Intl.NumberFormat('fr-FR', {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(value);
    }
    return value;
  };

  // Rendu d'un graphique en ligne
  const renderLineChart = () => {
    const { xAxis, lines } = chartConfig;

    return (
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey={xAxis}
          tick={{ fontSize: 12 }}
          stroke="#666"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#666"
          tickFormatter={formatAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="line"
        />
        {lines.map((lineConfig, index) => (
          <Line
            key={index}
            type={lineConfig.type || 'monotone'}
            dataKey={lineConfig.dataKey}
            stroke={lineConfig.stroke}
            name={lineConfig.name}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    );
  };

  // Rendu d'un graphique en barres
  const renderBarChart = () => {
    const { xAxis, bars } = chartConfig;

    return (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey={xAxis}
          tick={{ fontSize: 12 }}
          stroke="#666"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#666"
          tickFormatter={formatAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="square"
        />
        {bars.map((barConfig, index) => (
          <Bar
            key={index}
            dataKey={barConfig.dataKey}
            fill={barConfig.fill}
            name={barConfig.name}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    );
  };

  // Rendu d'un graphique camembert
  const renderPieChart = () => {
    const { dataKey, nameKey } = chartConfig;

    // Tooltip personnalisé pour le pie chart
    const PieTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        return (
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
              backgroundColor: 'white',
              border: '1px solid',
              borderColor: 'grey.300',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {data.name}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {formatValue(data.value, 'total')}
            </Typography>
          </Paper>
        );
      }
      return null;
    };

    return (
      <PieChart>
        <Pie
          data={chartData}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry) => `${entry[nameKey]}: ${formatValue(entry[dataKey], 'total')}`}
          labelLine={{ stroke: '#666', strokeWidth: 1 }}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
      </PieChart>
    );
  };

  // Rendu d'un graphique en aire
  const renderAreaChart = () => {
    const { xAxis, areas } = chartConfig;

    return (
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey={xAxis}
          tick={{ fontSize: 12 }}
          stroke="#666"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#666"
          tickFormatter={formatAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
          iconType="square"
        />
        {areas.map((areaConfig, index) => (
          <Area
            key={index}
            type={areaConfig.type || 'monotone'}
            dataKey={areaConfig.dataKey}
            fill={areaConfig.fill}
            stroke={areaConfig.stroke}
            name={areaConfig.name}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    );
  };

  // Router vers le bon type de graphique
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Aucune donnée à afficher
          </Typography>
        </Box>
      );
    }

    switch (chartType) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'area':
        return renderAreaChart();
      default:
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 300,
            }}
          >
            <Typography variant="body2" color="error">
              Type de graphique non supporté: {chartType}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        p: 2,
        borderRadius: 1.5,
        mb: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {chartTitle && (
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: 'text.primary',
          }}
        >
          {chartTitle}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
    </Box>
  );
};

export default ChartRenderer;
