import React, { useMemo, memo } from 'react';
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
import { Box, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';

/**
 * Composant universel pour afficher des graphiques Recharts
 * Supporte: line, bar, pie, area
 *
 * Sensible au thème (dark/light) : avant, fonds/axes/grille étaient codés en
 * dur en blanc/gris clair, ce qui produisait une carte blanche criarde en
 * thème sombre — le défaut visuel le plus visible de l'interface IA.
 */
const ChartRenderer = ({ chartType, chartTitle, chartData, chartConfig }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const axisColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;
  const paperBg = theme.palette.background.paper;
  const borderColor = theme.palette.divider;

  // Tooltip personnalisé avec style Material-UI (adapté au thème courant)
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            backgroundColor: paperBg,
            border: '1px solid',
            borderColor,
          }}
        >
          {label && (
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
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
  const formatAxisTick = (value) => {
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
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey={xAxis}
          tick={{ fontSize: 12, fill: axisColor }}
          stroke={axisColor}
        />
        <YAxis
          tick={{ fontSize: 12, fill: axisColor }}
          stroke={axisColor}
          tickFormatter={formatAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: theme.palette.text.primary }}
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
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey={xAxis}
          tick={{ fontSize: 12, fill: axisColor }}
          stroke={axisColor}
        />
        <YAxis
          tick={{ fontSize: 12, fill: axisColor }}
          stroke={axisColor}
          tickFormatter={formatAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: theme.palette.text.primary }}
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
              backgroundColor: paperBg,
              border: '1px solid',
              borderColor,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
              {data.name}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {formatValue(data.value, 'total')}
            </Typography>
          </Paper>
        );
      }
      return null;
    };

    // Sur mobile, les labels externes (nom + valeur à côté de chaque part)
    // débordent et se chevauchent sur un écran étroit. On les retire au
    // profit d'une légende classique sous le graphique.
    return (
      <PieChart>
        <Pie
          data={chartData}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={isMobile ? 80 : 100}
          label={isMobile ? false : (entry) => `${entry[nameKey]}: ${formatValue(entry[dataKey], 'total')}`}
          labelLine={isMobile ? false : { stroke: axisColor, strokeWidth: 1 }}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        {isMobile && (
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: '12px', color: theme.palette.text.primary }}
          />
        )}
      </PieChart>
    );
  };

  // Rendu d'un graphique en aire
  const renderAreaChart = () => {
    const { xAxis, areas } = chartConfig;

    return (
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey={xAxis}
          tick={{ fontSize: 12, fill: axisColor }}
          stroke={axisColor}
        />
        <YAxis
          tick={{ fontSize: 12, fill: axisColor }}
          stroke={axisColor}
          tickFormatter={formatAxisTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: theme.palette.text.primary }}
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

  // Router vers le bon type de graphique - Mémorisé pour éviter les re-renders
  const memoizedChart = useMemo(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, chartData, chartConfig, theme.palette.mode, isMobile]);

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        p: 2,
        borderRadius: 1.5,
        mb: 2,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 1px 4px rgba(0,0,0,0.4)'
          : '0 1px 3px rgba(0,0,0,0.1)',
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
        {memoizedChart}
      </ResponsiveContainer>
    </Box>
  );
};

// Mémorise le composant pour éviter les re-renders inutiles
export default memo(ChartRenderer, (prevProps, nextProps) => {
  // Ne re-render que si les données changent réellement
  return (
    prevProps.chartType === nextProps.chartType &&
    prevProps.chartTitle === nextProps.chartTitle &&
    JSON.stringify(prevProps.chartData) === JSON.stringify(nextProps.chartData) &&
    JSON.stringify(prevProps.chartConfig) === JSON.stringify(nextProps.chartConfig)
  );
});
