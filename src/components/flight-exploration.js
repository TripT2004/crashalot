import React from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import view from "./flight-exploration/view.html?raw";
import "./flight-exploration/style.css";
import { createRoot } from "react-dom/client";
import { AreaBump } from "@nivo/bump";
export async function mountFlightExploration(container) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/flight-exploration.json`,
  );
  if (!response.ok) throw new Error("Flight exploration data unavailable");
  const data = await response.json();
  container.innerHTML = view;
  const root = container.querySelector(".flight-exploration");
  let active = false,
    destroyed = false,
    hasRenderedArea = false,
    tableCohort = null;

  const meta = data.rows.map((row) =>
    Object.fromEntries(data.columns.map((c, i) => [c, row[i]])),
  );
  const byId = new Map(meta.map((r) => [r.source_id, r]));
  const records = meta.map((r) => [
    r.source_id,
    ["departure", "in_flight", "arrival"].includes(r.phase)
      ? r.phase
      : "unresolved",
  ]);
  const phaseNames = {
    all: "All records",
    ordered: "Known airborne phase",
    later: "Crash after departure",
    arrival: "Crash during arrival",
    departure: "Crash during departure",
    in_flight: "Crash in flight",
    unresolved: "Ground / unknown",
  };
  const groups = {
    all: records,
    ordered: records.filter((r) => r[1] !== "unresolved"),
    later: records.filter((r) => ["in_flight", "arrival"].includes(r[1])),
    ...Object.fromEntries(
      ["departure", "in_flight", "arrival", "unresolved"].map((k) => [
        k,
        records.filter((r) => r[1] === k),
      ]),
    ),
  };

  const minYear = d3.min(meta, (r) => r.year),
    maxYear = d3.max(meta, (r) => r.year);
  let selected = "all",
    cell = null,
    hoverBin = 0,
    measure = "count";
  const format = d3.format(","),
    percent = d3.format(".1%");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const svg = d3.select(root.querySelector(".flight-flow"));
  let graph, unit, vertical, width, overlay, linkPath;
  const color = (d) =>
    d.key === "unresolved"
      ? "var(--muted-foreground)"
      : d.outcome
        ? "var(--viz-series-2)"
        : "var(--viz-series-1)";
  const identity = (id) =>
    `${data.source.dataset}@${data.source.revision}:${id}`;
  const causeOrder = data.rules.area_display.causes;
  const displayLabels = data.rules.area_display.labels;
  const causeColors = {
    technical: "var(--viz-series-1)",
    human: "var(--viz-series-2)",
    weather: "var(--viz-series-3)",
    other: "var(--viz-series-4)",
    intentional: "var(--viz-series-4)",
    unknown: "var(--muted-foreground)",
  };
  const areaElement = root.querySelector(".area-stage"),
    reactRoot = createRoot(areaElement);
  function selectedRecords() {
    return groups[selected].filter(([id]) => {
      const r = byId.get(id);
      return (
        !cell ||
        (r.cause === cell.cause &&
          (cell.binStart == null ||
            (r.year >= cell.binStart && r.year <= cell.binEnd)))
      );
    });
  }
  function payload() {
    const ids = selectedRecords().map((r) => r[0]);
    const denominatorRecordIds = groups[selected]
      .map((r) => r[0])
      .filter((id) => {
        const r = byId.get(id);
        return (
          causeOrder.includes(r.cause) &&
          (!cell ||
            cell.binStart == null ||
            (r.year >= cell.binStart && r.year <= cell.binEnd))
        );
      });
    return {
      dataset: data.source.dataset,
      revision: data.source.revision,
      filter: data.rules.filter,
      cohort: selected,
      periodPolicy: data.rules.periods,
      measure,
      cell,
      recordIds: ids,
      recordKeys: ids.map(identity),
      denominatorRecordIds,
    };
  }
  function announce(persist) {
    const p = payload();
    const extra = cell
      ? ` → ${data.rules.cause_labels[cell.cause]}${cell.binStart != null ? " / " + cell.binStart + "–" + cell.binEnd : ""}`
      : "";
    root.querySelector(".selection-label").textContent = cell
      ? `${phaseNames[selected]} · highlighting ${displayLabels[cell.cause]}${cell.binStart != null ? " / " + cell.binStart + "–" + cell.binEnd : ""} · ${format(p.recordIds.length)} matching records`
      : `Phase filter: ${phaseNames[selected]} · ${format(p.recordIds.length)} records`;
    root
      .querySelectorAll("[data-cohort]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.cohort === selected)),
      );
    root
      .querySelectorAll(".cause-legend [data-cause]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.cause === cell?.cause)),
      );
    root
      .querySelectorAll(".exact-table [data-cause]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            cell?.cause === b.dataset.cause &&
              cell?.binStart === +b.dataset.period,
          ),
        ),
      );
    root.querySelector("[data-clear-selection]").disabled =
      selected === "all" && !cell;
    svg
      .selectAll("[data-cohort-key]")
      .attr("aria-pressed", (d) => String(selected === d.key));
    root.selection = p;
    root.dispatchEvent(
      new CustomEvent("flight-phase:select", { bubbles: true, detail: p }),
    );
    root.dispatchEvent(
      new CustomEvent("flight-safety:selection", { bubbles: true, detail: p }),
    );
    inspect(p);
  }
  function choose(key) {
    selected = selected === key ? "all" : key;
    cell = null;
    root.querySelector(".area-detail").textContent = "";
    update(true);
    renderArea();
    announce(true);
  }
  function update(animate) {
    if (!overlay) return;
    const active = new Set(selectedRecords().map((r) => r[0]));
    // Each source phase remains a contiguous band. A cause-period cell may select a
    // noncontiguous subset inside a phase; compress it proportionally within that band.
    const target =
      animate && !reduced.matches
        ? overlay.interrupt().transition().duration(420).ease(d3.easeCubicOut)
        : overlay.interrupt();
    const selectedCount = (d) =>
      groups[d.terminal].reduce((n, r) => n + active.has(r[0]), 0);
    target
      .attr("stroke-width", (d) => selectedCount(d) * unit)
      .attr("d", (d) => {
        const shift =
          (-d.link.value / 2 + d.bandOffset + selectedCount(d) / 2) * unit;
        return linkPath({
          ...d.link,
          y0: d.link.y0 + shift,
          y1: d.link.y1 + shift,
        });
      });
  }

  function periodBins() {
    const p = data.rules.periods;
    return d3
      .range(p.start_inclusive, p.end_exclusive, p.width_years)
      .map((start) => ({
        start,
        end: start + p.width_years - 1,
        id: `${start}–${start + p.width_years - 1}`,
        label: `${start}–${String(start + p.width_years - 1).slice(-2)}`,
        width: p.width_years,
      }));
  }
  function resolved(token) {
    const c = getComputedStyle(root)
      .getPropertyValue(token.slice(4, -1))
      .trim();
    return c || token;
  }
  function renderArea() {
    if (destroyed || !active) return;
    const bins = periodBins(),
      members = groups[selected].map(([id]) => byId.get(id));
    const displayed = members.filter((r) => causeOrder.includes(r.cause));
    const excluded = members.filter((r) => !causeOrder.includes(r.cause));
    const totals = bins.map(
      (b) =>
        displayed.filter((r) => r.year >= b.start && r.year <= b.end).length,
    );
    const allCells = [];
    const series = causeOrder.map((cause) => ({
      id: cause,
      data: bins.map((b, i) => {
        const ids = members
          .filter(
            (r) => r.year >= b.start && r.year <= b.end && r.cause === cause,
          )
          .map((r) => r.source_id);
        const y = totals[i] ? ids.length / totals[i] : 0;
        allCells.push({
          cause,
          binStart: b.start,
          binEnd: b.end,
          count: ids.length,
          denominator: totals[i],
          share: y,
          recordIds: ids,
        });
        return {
          x: b.id,
          y: measure === "percentage" ? y : ids.length,
          count: ids.length,
          denominator: totals[i],
          period: b,
        };
      }),
    }));
    root.areaData = {
      measure,
      bins,
      series,
      cells: allCells,
      displayedCount: displayed.length,
      excludedCount: excluded.length,
    };
    const w = areaElement.getBoundingClientRect().width,
      h = areaElement.getBoundingClientRect().height;
    if (w < 1) return;
    const margin = { top: 26, right: 34, bottom: 52, left: 34 };
    const tickStep = w >= 780 ? 1 : w >= 480 ? 2 : 5;
    const tickIndices = new Set(d3.range(0, bins.length, tickStep));
    const pointIndex = (e) =>
      Math.max(
        0,
        Math.min(
          bins.length - 1,
          Math.round(
            ((e.clientX -
              areaElement.getBoundingClientRect().left -
              margin.left) /
              (w - margin.left - margin.right)) *
              (bins.length - 1),
          ),
        ),
      );
    const describe = (cause, i) => {
      const row = series.find((s) => s.id === cause).data[i];
      return `${displayLabels[cause]} · ${row.period.start}–${row.period.end} · ${row.denominator ? percent(row.count / row.denominator) : "— (no denominator)"} · ${format(row.count)} of ${format(row.denominator)} displayed records`;
    };
    const tooltip = ({ serie }) => {
      const i = Math.min(hoverBin, bins.length - 1);
      return React.createElement(
        "div",
        {
          style: {
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            padding: "10px 12px",
            maxWidth: 260,
          },
        },
        describe(serie.id, i),
      );
    };
    const fg = resolved("var(--foreground)"),
      border = resolved("var(--border)");
    renderExactTable(allCells, bins);
    const Frame = ({ innerWidth, innerHeight }) =>
      React.createElement("rect", {
        width: innerWidth,
        height: innerHeight,
        fill: "none",
        stroke: border,
        strokeWidth: 1,
        pointerEvents: "none",
      });
    reactRoot.render(
      React.createElement(AreaBump, {
        key: measure,
        width: w,
        height: h,
        margin,
        data: series,
        align: "end",
        spacing: 3,
        xPadding: 0.5,
        interpolation: "smooth",
        colors: (s) => resolved(causeColors[s.id]),
        blendMode: "normal",
        fillOpacity: (s) => (cell && cell.cause !== s.id ? 0.18 : 0.65),
        activeFillOpacity: 0.85,
        inactiveFillOpacity: 0.2,
        borderWidth: 0,
        activeBorderWidth: 0,
        inactiveBorderWidth: 0,
        startLabel: false,
        endLabel: false,
        enableGridX: false,
        axisTop: null,
        axisBottom: {
          tickSize: 4,
          tickPadding: 10,
          tickValues: bins.map((b) => b.id),
          format: (v) =>
            tickIndices.has(bins.findIndex((b) => b.id === v))
              ? bins.find((b) => b.id === v)?.label
              : "",
          legend: "Five-year period · calendar years",
          legendPosition: "middle",
          legendOffset: 38,
        },
        theme: {
          text: { fill: fg, fontSize: 12 },
          axis: {
            ticks: { text: { fill: fg, fontSize: 12 } },
            legend: { text: { fill: fg, fontSize: 12 } },
            domain: { line: { stroke: border } },
          },
        },
        animate: active && hasRenderedArea && !reduced.matches,
        motionConfig: { tension: 210, friction: 30 },
        layers: [Frame, "axes", "areas"],
        tooltip,
        onMouseEnter: (s, e) => {
          hoverBin = pointIndex(e);
          root.querySelector(".area-detail").textContent = describe(
            s.id,
            hoverBin,
          );
        },
        onMouseMove: (s, e) => {
          hoverBin = pointIndex(e);
          root.querySelector(".area-detail").textContent = describe(
            s.id,
            hoverBin,
          );
        },
        onClick: (s, e) => {
          const b = bins[pointIndex(e)];
          const same = cell?.cause === s.id && cell?.binStart === b.start;
          cell = same
            ? null
            : { cause: s.id, binStart: b.start, binEnd: b.end };
          update(true);
          renderArea();
          announce(true);
          root.querySelector(".area-detail").textContent = describe(
            s.id,
            pointIndex(e),
          );
        },
        role: "img",
        ariaLabel: `Area bump: ${measure === "percentage" ? "percentages of the four displayed causes" : "raw counts"} across eleven five-year periods, anchored at zero at the bottom`,
      }),
    );
    hasRenderedArea = true;
    const otherCount = excluded.filter((r) => r.cause === "other").length,
      unknownCount = excluded.filter((r) => r.cause === "unknown").length;
    root.querySelector(".area-caption").textContent =
      `Others (${format(otherCount)}) and Not Recorded (${format(unknownCount)}) are excluded from this chart, retained in the Sankey. Percentages use only these four displayed causes in each period. ${measure === "count" ? "Thickness = raw count." : "Thickness = percentage; nonempty periods total 100%."} 2025 is the right boundary, not an included year.`;
    root.querySelector(".area-reading").textContent =
      `Order = rank · thickness = ${measure === "count" ? "raw count" : "percentage of the four displayed causes"}.`;
    root
      .querySelectorAll("[data-measure]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.measure === measure)),
      );
    if (!root.querySelector(".area-detail").textContent)
      root.querySelector(".area-detail").textContent =
        `${format(displayed.length)} displayed / ${format(members.length)} phase-selected records · ${measure === "count" ? "raw counts" : "percentages of four displayed causes"} · 11 five-year periods`;
  }
  function renderExactTable(cells, bins) {
    if (tableCohort === selected) return;
    tableCohort = selected;
    const body = root.querySelector(".exact-table tbody");
    body.replaceChildren();
    for (const bin of bins) {
      const row = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = bin.id;
      row.append(th);
      for (const cause of causeOrder) {
        const value = cells.find(
          (c) => c.cause === cause && c.binStart === bin.start,
        );
        const td = document.createElement("td"),
          button = document.createElement("button");
        button.type = "button";
        button.className = "exact-value";
        button.dataset.cause = cause;
        button.dataset.period = bin.start;
        button.textContent = `${format(value.count)} · ${value.denominator ? percent(value.share) : "—"}`;
        button.setAttribute(
          "aria-label",
          `${displayLabels[cause]}, ${bin.id}: ${value.count} of ${value.denominator} displayed records, ${value.denominator ? percent(value.share) : "no denominator"}. Highlight these records.`,
        );
        button.setAttribute(
          "aria-pressed",
          String(cell?.cause === cause && cell?.binStart === bin.start),
        );
        button.addEventListener("click", () => {
          cell =
            cell?.cause === cause && cell?.binStart === bin.start
              ? null
              : { cause, binStart: bin.start, binEnd: bin.end };
          update(true);
          renderArea();
          announce(true);
          root.querySelector(".area-detail").textContent =
            `${displayLabels[cause]} · ${bin.id} · ${value.denominator ? percent(value.share) : "— (no denominator)"} · ${format(value.count)} of ${format(value.denominator)} displayed records`;
        });
        td.append(button);
        row.append(td);
      }
      body.append(row);
    }
  }
  function inspect(p) {
    const out = root.querySelector(".inspect-rows");
    out.replaceChildren();
    root.querySelector(".inspector-caption").textContent =
      `First ${Math.min(5, p.recordIds.length)} of ${format(p.recordIds.length)} selected source records; IDs are preserved, never renumbered.`;
    for (const id of p.recordIds.slice(0, 5)) {
      const r = byId.get(id),
        div = document.createElement("div");
      div.className = "inspect-record text-small";
      const a = document.createElement("div");
      a.textContent = `Source ID ${id} · ${r.date} · ${r.aircraft}`;
      const b = document.createElement("div");
      b.textContent = `flight_phase: ${r.raw_phase || "(blank)"} → ${r.phase}; crash_cause: ${r.raw_cause || "(blank)"} → ${r.cause}`;
      div.append(a, b);
      out.append(div);
    }
    root.querySelector(".provenance").textContent =
      `${data.source.dataset} · revision ${data.source.revision.slice(0, 12)} · mapping ${data.rules.version}. Source IDs are unique within this pinned snapshot. Full record keys include dataset + revision + ID. Five-year periods and raw-count semantics are versioned; no technical-domain inference.`;
  }

  function label(x, y, line1, line2, anchor = "start") {
    const t = svg
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", anchor)
      .attr("class", "flow-label");
    t.append("tspan").attr("x", x).text(line1);
    if (line2) t.append("tspan").attr("x", x).attr("dy", 19).text(line2);
  }
  function draw() {
    if (destroyed || !active) return;
    width = root.querySelector(".sankey-stage").getBoundingClientRect().width;
    if (width < 1) return;
    vertical = width < 560;
    const W = vertical ? 610 : width,
      H = vertical ? width : 470;
    unit = (vertical ? Math.min(95, width * 0.29) : 90) / records.length;
    const end = vertical ? 560 : W - 18;
    const xs = vertical
      ? [52, 172, 292, 412]
      : [16, W * 0.245, W * 0.49, W * 0.735];
    const yMain = vertical ? 18 : 58;
    const ySink = vertical ? width - 110 : 170;
    const yUnknown = vertical ? width - 52 : 295;
    const specs = [
      ["all", xs[0], yMain, 0],
      ["ordered", xs[1], yMain, 1],
      ["later", xs[2], yMain, 2],
      ["arrival", xs[3], yMain, 3],
      ["crash", end, ySink, 4],
      ["unresolved", xs[1], yUnknown, 1],
    ];
    const links = [
      {
        source: "all",
        target: "ordered",
        key: "ordered",
        value: groups.ordered.length,
        rank: 0,
      },
      {
        source: "all",
        target: "unresolved",
        key: "unresolved",
        value: groups.unresolved.length,
        rank: 1,
      },
      {
        source: "ordered",
        target: "later",
        key: "later",
        value: groups.later.length,
        rank: 0,
      },
      {
        source: "ordered",
        target: "crash",
        key: "departure",
        value: groups.departure.length,
        rank: 3,
        outcome: true,
      },
      {
        source: "later",
        target: "arrival",
        key: "arrival",
        value: groups.arrival.length,
        rank: 0,
      },
      {
        source: "later",
        target: "crash",
        key: "in_flight",
        value: groups.in_flight.length,
        rank: 2,
        outcome: true,
      },
      {
        source: "arrival",
        target: "crash",
        key: "arrival",
        value: groups.arrival.length,
        rank: 1,
        outcome: true,
      },
    ];
    const layout = sankey()
      .nodeId((d) => d.id)
      .nodeWidth(7)
      .nodePadding(20)
      .nodeAlign((d) => d.column)
      .extent([
        [0, 0],
        [W, H],
      ]);
    graph = layout({
      nodes: specs.map((s) => ({ id: s[0], column: s[3] })),
      links,
    });
    graph.nodes.forEach((n) => {
      const s = specs.find((s) => s[0] === n.id);
      n.x0 = s[1];
      n.x1 = s[1] + 7;
      n.y0 = s[2];
      n.y1 = s[2] + n.value * unit;
      n.sourceLinks.sort((a, b) => a.rank - b.rank);
      n.targetLinks.sort((a, b) => a.rank - b.rank);
    });
    graph.links.forEach((l) => (l.width = l.value * unit));
    layout.update(graph);
    svg.selectAll("*").remove();
    svg
      .attr("viewBox", `0 0 ${width} ${vertical ? 620 : 315}`)
      .attr("height", vertical ? 620 : 315);
    svg
      .append("desc")
      .text(
        `Sequential split of ${format(records.length)} scheduled revenue archive records. Width represents records, not exposure or success probabilities.`,
      );
    const path = (linkPath = vertical
      ? d3
          .linkVertical()
          .source((d) => [d.y0, d.source.x1])
          .target((d) => [d.y1, d.target.x0])
      : sankeyLinkHorizontal());
    svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("class", "flow-base")
      .attr("d", path)
      .attr("stroke", color)
      .attr("stroke-width", (d) => d.width);
    const bands = graph.links.flatMap((link) => {
      let offset = 0;
      const out = [];
      for (const terminal of [
        "arrival",
        "in_flight",
        "departure",
        "unresolved",
      ]) {
        if (!groups[link.key].some((r) => r[1] === terminal)) continue;
        out.push({ link, terminal, bandOffset: offset });
        offset += groups[terminal].length;
      }
      return out;
    });
    overlay = svg
      .append("g")
      .selectAll("path")
      .data(bands)
      .join("path")
      .attr("class", "flow-selected")
      .attr("d", (d) => path(d.link))
      .attr("stroke", (d) => color(d.link))
      .attr("stroke-width", 0);
    svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("class", "flow-hit cursor-interaction")
      .attr("d", path)
      .attr("stroke-width", (d) => Math.max(d.width, 32))
      .attr("data-cohort-key", (d) => d.key)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-pressed", (d) => String(selected === d.key))
      .attr(
        "aria-label",
        (d) =>
          `${phaseNames[d.key]}: ${format(d.value)} records. Select this cohort.`,
      )
      .on("click", (_, d) => choose(d.key))
      .on("keydown", (e, d) => {
        if (["Enter", " "].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          choose(d.key);
        }
      });
    svg
      .append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("class", "flow-node")
      .attr("x", (d) => (vertical ? d.y0 : d.x0))
      .attr("y", (d) => (vertical ? d.x0 : d.y0))
      .attr("width", (d) => (vertical ? d.y1 - d.y0 : 7))
      .attr("height", (d) => (vertical ? 7 : d.y1 - d.y0));
    if (!vertical) {
      label(16, 22, "All records", format(records.length));
      label(
        xs[1],
        22,
        "Departure",
        `${format(groups.ordered.length)} reach this split`,
      );
      label(xs[2], 22, "In flight", `${format(groups.later.length)} remain`);
      label(xs[3], 22, "Arrival", `${format(groups.arrival.length)} remain`);
      label(
        width - 18,
        ySink - 30,
        "Known-phase records",
        format(groups.ordered.length),
        "end",
      );
      label(
        xs[1] + 14,
        yUnknown - 7,
        `Ground / unknown · ${format(groups.unresolved.length)}`,
      );
      label(xs[1] + 14, 165, `Departure · ${format(groups.departure.length)}`);
      label(xs[2] + 14, 179, `In flight · ${format(groups.in_flight.length)}`);
      label(
        width - 18,
        116,
        `Arrival · ${format(groups.arrival.length)}`,
        "",
        "end",
      );
    } else {
      const tx = Math.min(width - 142, 130);
      label(tx, 47, "All records", format(records.length));
      label(
        tx,
        167,
        "Departure",
        `${format(groups.ordered.length)} reach split`,
      );
      label(tx, 287, "In flight", `${format(groups.later.length)} remain`);
      label(tx, 407, "Arrival", `${format(groups.arrival.length)} remain`);
      label(
        width - 16,
        600,
        `Known-phase records · ${format(groups.ordered.length)}`,
        "",
        "end",
      );
      label(
        width - 12,
        143,
        "Ground /",
        `unknown · ${format(groups.unresolved.length)}`,
        "end",
      );
    }
    update(false);
  }

  for (const cause of causeOrder) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cursor-interaction text-small";
    b.dataset.cause = cause;
    b.setAttribute("aria-pressed", "false");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = causeColors[cause];
    b.append(sw, document.createTextNode(displayLabels[cause]));
    b.addEventListener("click", () => {
      cell = cell?.cause === cause && cell?.binStart == null ? null : { cause };
      update(true);
      renderArea();
      announce(true);
    });
    root.querySelector(".cause-legend").append(b);
  }
  root.querySelectorAll("[data-cohort]").forEach((b) => {
    const k = b.dataset.cohort;
    const short = {
      all: "All",
      departure: "Departure",
      in_flight: "In flight",
      arrival: "Arrival",
      unresolved: "Ground / unknown",
    };
    b.textContent = `${short[k]} · ${format(groups[k].length)}`;
    b.addEventListener("click", () => choose(k));
  });
  root.querySelector(".cohort-caption").textContent =
    `${format(records.length)} archive records · Scheduled Revenue Flight · 1970–2024 · Ribbon width = records`;
  root.querySelectorAll("[data-measure]").forEach((b) =>
    b.addEventListener("click", () => {
      measure = b.dataset.measure;
      root.querySelector(".area-detail").textContent = "";
      renderArea();
      announce(true);
    }),
  );
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      clearSelection();
    } else if (
      e.target.closest('button, select, input, summary, a, [role="button"]')
    )
      e.stopPropagation();
  });
  root
    .querySelector("[data-clear-selection]")
    .addEventListener("click", clearSelection);
  root.querySelector(".jump-to-causes").addEventListener("click", () => {
    root.querySelector("#flight-causes-title").focus({ preventScroll: true });
    root
      .querySelector(".area-section")
      .scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
        block: "start",
      });
  });
  function clearSelection() {
    selected = "all";
    cell = null;
    root.querySelector(".area-detail").textContent = "";
    update(true);
    renderArea();
    announce(true);
  }

  const observer = new ResizeObserver(() => {
    draw();
    renderArea();
  });
  observer.observe(root.querySelector(".sankey-stage"));
  function onTheme() {
    renderArea();
  }
  function onMotion() {
    if (reduced.matches) {
      svg.selectAll("*").interrupt();
      update(false);
    }
    hasRenderedArea = false;
    renderArea();
  }
  window.addEventListener("themechange", onTheme);
  reduced.addEventListener("change", onMotion);
  announce(false);
  return {
    resize() {
      draw();
      renderArea();
    },
    setActive(value) {
      if (active === value) return;
      active = value;
      if (!active) {
        svg.selectAll("*").interrupt();
        reactRoot.render(null);
        return;
      }
      hasRenderedArea = false;
      draw();
      renderArea();
      announce(false);
    },
    destroy() {
      destroyed = true;
      observer.disconnect();
      window.removeEventListener("themechange", onTheme);
      reduced.removeEventListener("change", onMotion);
      svg.selectAll("*").interrupt();
      reactRoot.unmount();
      root.remove();
    },
  };
}
