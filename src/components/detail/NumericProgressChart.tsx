import { addDays, format, parseISO } from 'date-fns';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/src/theme';
import type { HabitNumericEntry } from '@/src/types/Habit';

type NumericProgressChartProps = {
  entries: HabitNumericEntry[];
  accentColor?: string | null;
  today: string;
  unit?: string | null;
};

type ChartPoint = {
  date: string;
  label: string;
  value: number | null;
};

const CHART_HEIGHT = 190;
const CHART_LEFT_PADDING = 50;
const CHART_RIGHT_PADDING = 58;
const CHART_TOP_PADDING = 22;
const CHART_BOTTOM_PADDING = 34;
const POINT_GAP = 24;
const MIN_VISIBLE_DAYS = 30;

export function NumericProgressChart({
  accentColor = colors.primary,
  entries,
  today,
  unit,
}: NumericProgressChartProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const chartData = useMemo(() => getChartPoints(entries, today), [entries, today]);
  const visibleValues = chartData
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const averageValue =
    visibleValues.length === 0
      ? 0
      : visibleValues.reduce((total, value) => total + value, 0) / visibleValues.length;
  const maxValue = Math.max(0, ...visibleValues);
  const yMax = getNiceAxisMax(Math.max(maxValue, averageValue, 1));
  const yAxisTicks = getYAxisTicks(yMax);
  const chartWidth = Math.max(
    320,
    CHART_LEFT_PADDING + CHART_RIGHT_PADDING + (chartData.length - 1) * POINT_GAP
  );
  const pathData = getPathData(chartData, yMax);
  const averageY = getY(averageValue, yMax);
  const maxY = getY(maxValue, yMax);
  const referenceLabelPositions = getReferenceLabelPositions(averageY, maxY);
  const valueSuffix = unit ? ` ${unit}` : '';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Progress graph</Text>
        <Text style={styles.title}>Numeric values</Text>
        <Text style={styles.subtitle}>Last 30 days of saved progress.</Text>
      </View>

      {visibleValues.length === 0 ? (
        <View style={styles.emptyNote}>
          <Text style={styles.emptyTitle}>No progress entries yet.</Text>
          <Text style={styles.emptyText}>Save a value to start drawing the trend.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            onContentSizeChange={() => {
              scrollRef.current?.scrollToEnd({ animated: false });
            }}
            ref={scrollRef}
            showsHorizontalScrollIndicator={false}>
            <Svg height={CHART_HEIGHT} width={chartWidth}>
              <Line
                stroke={colors.surfaceMuted}
                strokeWidth={1}
                x1={CHART_LEFT_PADDING}
                x2={chartWidth - CHART_RIGHT_PADDING}
                y1={CHART_HEIGHT - CHART_BOTTOM_PADDING}
                y2={CHART_HEIGHT - CHART_BOTTOM_PADDING}
              />
              <Line
                stroke={colors.surfaceMuted}
                strokeWidth={1}
                x1={CHART_LEFT_PADDING}
                x2={CHART_LEFT_PADDING}
                y1={CHART_TOP_PADDING}
                y2={CHART_HEIGHT - CHART_BOTTOM_PADDING}
              />
              {yAxisTicks.map((tick) => {
                const y = getY(tick, yMax);

                return (
                  <G key={tick}>
                    <Line
                      stroke={colors.border}
                      strokeWidth={1}
                      x1={CHART_LEFT_PADDING - 4}
                      x2={chartWidth - CHART_RIGHT_PADDING}
                      y1={y}
                      y2={y}
                    />
                    <SvgText
                      fill={colors.textSubtle}
                      fontSize={10}
                      fontWeight="900"
                      textAnchor="end"
                      x={CHART_LEFT_PADDING - 10}
                      y={y + 4}>
                      {formatAxisNumber(tick)}
                    </SvgText>
                  </G>
                );
              })}
              <ReferenceLine
                chartWidth={chartWidth}
                label="AVG"
                labelY={referenceLabelPositions.average}
                y={averageY}
              />
              <ReferenceLine
                chartWidth={chartWidth}
                label="MAX"
                labelY={referenceLabelPositions.max}
                y={maxY}
              />
              {pathData ? (
                <Path d={pathData} fill="none" stroke={accentColor ?? colors.primary} strokeWidth={3} />
              ) : null}
              {chartData.map((point, index) => {
                if (point.value === null) {
                  return null;
                }

                const x = getX(index);
                const y = getY(point.value, yMax);

                return (
                  <Circle
                    cx={x}
                    cy={y}
                    fill={colors.surface}
                    key={point.date}
                    r={4}
                    stroke={accentColor ?? colors.primary}
                    strokeWidth={2}
                  />
                );
              })}
              {chartData.map((point, index) => {
                const daysFromToday = chartData.length - 1 - index;

                if (daysFromToday === 0 || daysFromToday % 7 !== 0) {
                  return null;
                }

                return (
                  <SvgText
                    fill={colors.textSubtle}
                    fontSize={9}
                    fontWeight="800"
                    key={`${point.date}-label`}
                    textAnchor="middle"
                    x={getX(index)}
                    y={CHART_HEIGHT - 12}>
                    {point.label}
                  </SvgText>
                );
              })}
            </Svg>
          </ScrollView>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <Text style={styles.legendLabel}>Average</Text>
              <Text style={styles.legendValue}>
                {formatValueNumber(averageValue)}
                {valueSuffix}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={styles.legendLabel}>Max</Text>
              <Text style={styles.legendValue}>
                {formatValueNumber(maxValue)}
                {valueSuffix}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function ReferenceLine({
  chartWidth,
  label,
  labelY,
  y,
}: {
  chartWidth: number;
  label: string;
  labelY: number;
  y: number;
}) {
  return (
    <>
      <Line
        stroke={colors.textSubtle}
        strokeDasharray="5 5"
        strokeWidth={1}
        x1={CHART_LEFT_PADDING}
        x2={chartWidth - CHART_RIGHT_PADDING}
        y1={y}
        y2={y}
      />
      <SvgText
        fill={colors.textMuted}
        fontSize={10}
        fontWeight="900"
        textAnchor="start"
        x={chartWidth - CHART_RIGHT_PADDING + 8}
        y={labelY + 4}>
        {label}
      </SvgText>
    </>
  );
}

function getChartPoints(entries: HabitNumericEntry[], today: string): ChartPoint[] {
  const entryByDate = new Map(entries.filter((entry) => entry.date <= today).map((entry) => [entry.date, entry]));
  const todayDate = parseISO(today);

  return Array.from({ length: MIN_VISIBLE_DAYS }, (_, index) => {
    const date = addDays(todayDate, index - (MIN_VISIBLE_DAYS - 1));
    const dateString = format(date, 'yyyy-MM-dd');
    const entry = entryByDate.get(dateString);

    return {
      date: dateString,
      label: format(date, 'MMM d'),
      value: entry?.value ?? null,
    };
  });
}

function getPathData(points: ChartPoint[], maxValue: number) {
  const drawablePoints = points
    .map((point, index) =>
      point.value === null
        ? null
        : {
            x: getX(index),
            y: getY(point.value, maxValue),
          }
    )
    .filter((point): point is { x: number; y: number } => point !== null);

  if (drawablePoints.length === 0) {
    return null;
  }

  if (drawablePoints.length === 1) {
    const point = drawablePoints[0];
    return `M ${point.x - 1} ${point.y} L ${point.x + 1} ${point.y}`;
  }

  return drawablePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function getY(value: number, maxValue: number) {
  const chartRange = CHART_HEIGHT - CHART_TOP_PADDING - CHART_BOTTOM_PADDING;

  return CHART_TOP_PADDING + chartRange * (1 - Math.max(0, Math.min(value / maxValue, 1)));
}

function getX(index: number) {
  return CHART_LEFT_PADDING + index * POINT_GAP;
}

function getNiceAxisMax(value: number) {
  if (value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

function getYAxisTicks(maxValue: number) {
  return [maxValue, maxValue / 2, 0];
}

function getReferenceLabelPositions(averageY: number, maxY: number) {
  const minGap = 16;
  let averageLabelY = averageY;
  let maxLabelY = maxY;

  if (Math.abs(averageLabelY - maxLabelY) < minGap) {
    const midpoint = (averageLabelY + maxLabelY) / 2;
    maxLabelY = midpoint - minGap / 2;
    averageLabelY = midpoint + minGap / 2;
  }

  return {
    average: clampLabelY(averageLabelY),
    max: clampLabelY(maxLabelY),
  };
}

function clampLabelY(value: number) {
  return Math.max(CHART_TOP_PADDING + 6, Math.min(value, CHART_HEIGHT - CHART_BOTTOM_PADDING - 6));
}

function formatAxisNumber(value: number) {
  if (value >= 1000000) {
    return `${formatCompactNumber(value / 1000000)}m`;
  }

  if (value >= 1000) {
    return `${formatCompactNumber(value / 1000)}k`;
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatValueNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    ...typography.heading,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.caption,
  },
  emptyNote: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flex: 1,
    gap: 2,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  legendLabel: {
    color: colors.textMuted,
    ...typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  legendValue: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '900',
  },
});
