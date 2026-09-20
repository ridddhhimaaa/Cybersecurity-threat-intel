import React, { useEffect, useRef } from 'react';

export function GlobalThreatScene({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.parentElement.offsetWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight);

    // Mouse interaction for subtle parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.2;
    let targetRotationY = 0;
    let currentRotationX = 0.2;
    let currentRotationY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / width - 0.5;
      const y = (e.clientY - rect.top) / height - 0.5;
      targetRotationY = x * 0.4;
      targetRotationX = 0.2 + y * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate Earth surface points (continental outlines & grid)
    const points = [];
    const numLat = 36;
    const numLng = 72;
    const radius = Math.min(width, height) * 0.36;

    // Approximate continent mask using spherical coordinates
    // Creates high-density points over major landmasses (Americas, Eurasia, Africa, Australia)
    function isLand(lat, lng) {
      const latDeg = (lat * 180) / Math.PI;
      const lngDeg = (lng * 180) / Math.PI;

      // North America
      if (latDeg > 15 && latDeg < 70 && lngDeg > -160 && lngDeg < -50) return true;
      // South America
      if (latDeg > -55 && latDeg < 12 && lngDeg > -80 && lngDeg < -35) return true;
      // Europe
      if (latDeg > 35 && latDeg < 70 && lngDeg > -10 && lngDeg < 45) return true;
      // Africa
      if (latDeg > -35 && latDeg < 37 && lngDeg > -18 && lngDeg < 52) return true;
      // Asia
      if (latDeg > 5 && latDeg < 75 && lngDeg > 45 && lngDeg < 145) return true;
      // Australia
      if (latDeg > -45 && latDeg < -10 && lngDeg > 112 && lngDeg < 155) return true;

      return false;
    }

    // Populate spherical point cloud
    for (let i = 0; i <= numLat; i++) {
      const lat = (i * Math.PI) / numLat - Math.PI / 2;
      const r = Math.cos(lat);
      const y = Math.sin(lat);

      for (let j = 0; j < numLng; j++) {
        const lng = (j * 2 * Math.PI) / numLng - Math.PI;
        const x = r * Math.sin(lng);
        const z = r * Math.cos(lng);

        const land = isLand(lat, lng);
        // Include point if it's on land or occasionally for wireframe grid
        if (land || (i % 4 === 0 && j % 4 === 0)) {
          points.push({
            x,
            y,
            z,
            isLand: land,
            size: land ? 1.4 : 0.8,
            alpha: land ? 0.75 : 0.25,
          });
        }
      }
    }

    // Telemetry Network Nodes on the globe
    const nodes = [
      { lat: 0.7, lng: -1.3, label: 'US-EAST' },
      { lat: 0.65, lng: -2.1, label: 'US-WEST' },
      { lat: 0.9, lng: 0.0, label: 'EU-CENTRAL' },
      { lat: 0.6, lng: 2.0, label: 'AP-EAST' },
      { lat: -0.4, lng: -0.8, label: 'SA-BRAZIL' },
      { lat: -0.5, lng: 2.3, label: 'AP-SOUTH' },
      { lat: 0.2, lng: 1.3, label: 'IN-WEST' },
    ].map((n) => {
      const r = Math.cos(n.lat);
      return {
        x: r * Math.sin(n.lng),
        y: Math.sin(n.lat),
        z: r * Math.cos(n.lng),
        label: n.label,
        pulse: Math.random() * Math.PI * 2,
      };
    });

    // Network Arcs connecting nodes
    const arcs = [
      [0, 1],
      [0, 2],
      [2, 3],
      [2, 6],
      [6, 3],
      [3, 5],
      [0, 4],
      [1, 3],
    ];

    // Ambient floating space particles
    const spaceParticles = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 2,
      size: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.2 + 0.05,
    }));

    let globeAngle = 0;

    function render() {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const curRadius = Math.min(width, height) * 0.38;

      // Update rotation
      globeAngle += 0.003;
      currentRotationX += (targetRotationX - currentRotationX) * 0.05;
      currentRotationY += (targetRotationY - currentRotationY) * 0.05;

      const rotY = globeAngle + currentRotationY;
      const rotX = currentRotationX;

      // Background ambient space particles
      ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
      spaceParticles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -height / 2) p.y = height / 2;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(centerX + p.x, centerY + p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Background radial glow centered on Earth
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        curRadius * 0.3,
        centerX,
        centerY,
        curRadius * 1.4
      );
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      grad.addColorStop(0.5, 'rgba(13, 148, 136, 0.08)');
      grad.addColorStop(1, 'rgba(6, 10, 16, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Coordinate projection helper
      function project(x, y, z) {
        // Rotate around Y axis
        let x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        let z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);

        // Rotate around X axis
        let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        return {
          px: centerX + x1 * curRadius,
          py: centerY - y2 * curRadius,
          pz: z2, // positive is facing viewer
        };
      }

      // Draw Orbiting Rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, curRadius * 1.18, curRadius * 0.45, -0.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, curRadius * 1.35, curRadius * 0.3, 0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Project & Draw Earth points
      points.forEach((pt) => {
        const proj = project(pt.x, pt.y, pt.z);

        // Only draw points facing the viewer or subtle back
        if (proj.pz > -0.2) {
          const depthAlpha = Math.max(0.08, (proj.pz + 0.2) / 1.2);
          const finalAlpha = pt.alpha * depthAlpha;

          ctx.fillStyle = pt.isLand
            ? `rgba(34, 211, 238, ${finalAlpha})`
            : `rgba(6, 182, 212, ${finalAlpha * 0.5})`;

          ctx.beginPath();
          ctx.arc(proj.px, proj.py, pt.size * (0.8 + depthAlpha * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Project Network Nodes
      const projectedNodes = nodes.map((n) => {
        n.pulse += 0.05;
        const proj = project(n.x, n.y, n.z);
        return { ...n, ...proj };
      });

      // Draw Network Arcs
      arcs.forEach(([i, j]) => {
        const n1 = projectedNodes[i];
        const n2 = projectedNodes[j];

        if (n1.pz > -0.3 && n2.pz > -0.3) {
          const midX = (n1.px + n2.px) / 2;
          const midY = (n1.py + n2.py) / 2 - 25; // arch upward

          const avgPz = (n1.pz + n2.pz) / 2;
          const alpha = Math.max(0.1, (avgPz + 0.3) * 0.6);

          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(n1.px, n1.py);
          ctx.quadraticCurveTo(midX, midY, n2.px, n2.py);
          ctx.stroke();

          // Traveling pulse signal along arc
          const t = ((globeAngle * 3 + i) % 1);
          const pulseX = (1 - t) * (1 - t) * n1.px + 2 * (1 - t) * t * midX + t * t * n2.px;
          const pulseY = (1 - t) * (1 - t) * n1.py + 2 * (1 - t) * t * midY + t * t * n2.py;

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.5})`;
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Nodes
      projectedNodes.forEach((n) => {
        if (n.pz > -0.1) {
          const alpha = Math.min(1, Math.max(0.2, (n.pz + 0.1) * 1.2));
          const pulseSize = 3 + Math.sin(n.pulse) * 2;

          // Outer pulsing ring
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.4})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(n.px, n.py, pulseSize + 4, 0, Math.PI * 2);
          ctx.stroke();

          // Core node
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(n.px, n.py, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Label
          if (n.pz > 0.4) {
            ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.8})`;
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(n.label, n.px + 7, n.py + 3);
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
