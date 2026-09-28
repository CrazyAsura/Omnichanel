package com.omnichannel.backend.report.infrastructure.pdf.chart;

import com.omnichannel.backend.report.domain.valueobject.DistributionItem;
import com.omnichannel.backend.report.domain.valueobject.TimeSeriesPoint;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.plot.CategoryPlot;
import org.jfree.chart.plot.PiePlot;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.chart.renderer.category.BarRenderer;
import org.jfree.chart.renderer.category.StandardBarPainter;
import org.jfree.chart.title.TextTitle;
import org.jfree.data.category.DefaultCategoryDataset;
import org.jfree.data.general.DefaultPieDataset;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import javax.imageio.ImageIO;

/**
 * Utilitário responsável por renderizar gráficos corporativos de alta fidelidade
 * utilizando JFreeChart com paleta sóbria (Tailwind Slate/Indigo/Emerald/Amber)
 * e tipografia balanceada.
 */
public class JFreeChartRenderer {

    // Paleta contemporânea e profissional (anti-AI slop: sem gradientes berrantes)
    private static final Color COLOR_PRIMARY = new Color(79, 70, 229);    // Indigo 600
    private static final Color COLOR_SECONDARY = new Color(14, 165, 233);  // Sky 500
    private static final Color COLOR_SUCCESS = new Color(16, 185, 129);   // Emerald 500
    private static final Color COLOR_WARNING = new Color(245, 158, 11);   // Amber 500
    private static final Color COLOR_ACCENT = new Color(168, 85, 247);    // Purple 500
    private static final Color COLOR_MUTED = new Color(100, 116, 139);    // Slate 500

    private static final Color BG_WHITE = Color.WHITE;
    private static final Color GRID_LINE_COLOR = new Color(226, 232, 240); // Slate 200
    private static final Color TEXT_DARK = new Color(15, 23, 42);         // Slate 900

    private static final Font TITLE_FONT = new Font("SansSerif", Font.BOLD, 13);
    private static final Font LABEL_FONT = new Font("SansSerif", Font.PLAIN, 10);
    private static final Font LEGEND_FONT = new Font("SansSerif", Font.PLAIN, 10);

    private static final Color[] SLICE_COLORS = {
            COLOR_PRIMARY, COLOR_SECONDARY, COLOR_SUCCESS, COLOR_WARNING, COLOR_ACCENT, COLOR_MUTED
    };

    public byte[] renderDistributionPieChart(List<DistributionItem> items, int width, int height) throws IOException {
        DefaultPieDataset<String> dataset = new DefaultPieDataset<>();
        for (DistributionItem item : items) {
            dataset.setValue(item.category(), item.value());
        }

        JFreeChart chart = ChartFactory.createPieChart(
                "Distribuição por Modo / Canal",
                dataset,
                true,   // legend
                false,  // tooltips
                false   // urls
        );

        applyGlobalChartStyles(chart);

        @SuppressWarnings("unchecked")
        PiePlot<String> plot = (PiePlot<String>) chart.getPlot();
        plot.setBackgroundPaint(BG_WHITE);
        plot.setOutlineVisible(false);
        plot.setLabelFont(LABEL_FONT);
        plot.setLabelPaint(TEXT_DARK);
        plot.setLabelBackgroundPaint(new Color(248, 250, 252));
        plot.setLabelOutlinePaint(GRID_LINE_COLOR);
        plot.setLabelShadowPaint(null);
        plot.setShadowPaint(null);
        plot.setSimpleLabels(true);

        int colorIndex = 0;
        for (DistributionItem item : items) {
            Color color = SLICE_COLORS[colorIndex % SLICE_COLORS.length];
            plot.setSectionPaint(item.category(), color);
            plot.setSectionOutlinePaint(item.category(), BG_WHITE);
            plot.setSectionOutlineStroke(item.category(), new BasicStroke(1.5f));
            colorIndex++;
        }

        return toPngBytes(chart, width, height);
    }

    public byte[] renderTimeSeriesBarChart(List<TimeSeriesPoint> points, int width, int height) throws IOException {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        for (TimeSeriesPoint point : points) {
            dataset.addValue(point.value(), "Atendimentos", point.label());
        }

        JFreeChart chart = ChartFactory.createBarChart(
                "Volume Diário de Interações",
                "Período",
                "Total Mensagens",
                dataset,
                PlotOrientation.VERTICAL,
                false, // legend
                false, // tooltips
                false  // urls
        );

        applyGlobalChartStyles(chart);

        CategoryPlot plot = chart.getCategoryPlot();
        plot.setBackgroundPaint(BG_WHITE);
        plot.setOutlineVisible(false);
        plot.setRangeGridlinePaint(GRID_LINE_COLOR);
        plot.setRangeGridlineStroke(new BasicStroke(0.8f));
        plot.setDomainGridlinesVisible(false);

        // Styling the Bar Renderer (Flat clean design, no 3D bevels)
        BarRenderer renderer = (BarRenderer) plot.getRenderer();
        renderer.setBarPainter(new StandardBarPainter());
        renderer.setSeriesPaint(0, COLOR_PRIMARY);
        renderer.setDrawBarOutline(false);
        renderer.setMaximumBarWidth(0.08);

        plot.getDomainAxis().setTickLabelFont(LABEL_FONT);
        plot.getDomainAxis().setLabelFont(LABEL_FONT);
        plot.getDomainAxis().setTickLabelPaint(COLOR_MUTED);
        plot.getDomainAxis().setAxisLinePaint(GRID_LINE_COLOR);

        plot.getRangeAxis().setTickLabelFont(LABEL_FONT);
        plot.getRangeAxis().setLabelFont(LABEL_FONT);
        plot.getRangeAxis().setTickLabelPaint(COLOR_MUTED);
        plot.getRangeAxis().setAxisLinePaint(GRID_LINE_COLOR);

        return toPngBytes(chart, width, height);
    }

    private void applyGlobalChartStyles(JFreeChart chart) {
        chart.setBackgroundPaint(BG_WHITE);
        chart.setBorderVisible(false);

        TextTitle title = chart.getTitle();
        if (title != null) {
            title.setFont(TITLE_FONT);
            title.setPaint(TEXT_DARK);
            title.setMargin(0, 0, 10, 0);
        }

        if (chart.getLegend() != null) {
            chart.getLegend().setItemFont(LEGEND_FONT);
            chart.getLegend().setItemPaint(TEXT_DARK);
            chart.getLegend().setBackgroundPaint(BG_WHITE);
            chart.getLegend().setBorder(0, 0, 0, 0);
        }
    }

    private byte[] toPngBytes(JFreeChart chart, int width, int height) throws IOException {
        // High density rendering (escala 2x para alta nitidez sem overhead)
        int scale = 2;
        BufferedImage bufferedImage = chart.createBufferedImage(width * scale, height * scale, BufferedImage.TYPE_INT_RGB, null);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024)) {
            ImageIO.write(bufferedImage, "png", baos);
            baos.flush();
            return baos.toByteArray();
        }
    }
}
