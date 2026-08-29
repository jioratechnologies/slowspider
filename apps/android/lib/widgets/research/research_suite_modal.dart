import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/app_theme.dart';
import '../atom_icon.dart';
import '../rendered_math_text.dart';

class PhysicalConstant {
  final String symbol;
  final String latex;
  final String name;
  final String category;
  final String valueStr;
  final String unit;
  final String? altValue;

  const PhysicalConstant({
    required this.symbol,
    required this.latex,
    required this.name,
    required this.category,
    required this.valueStr,
    required this.unit,
    this.altValue,
  });
}

const List<PhysicalConstant> physicalConstants = [
  PhysicalConstant(
    symbol: 'c',
    latex: 'c',
    name: 'Speed of light in vacuum',
    category: 'astrophysics',
    valueStr: '299 792 458',
    unit: 'm/s',
    altValue: '3.00 × 10⁸ m/s',
  ),
  PhysicalConstant(
    symbol: 'ħ',
    latex: r'\hbar',
    name: 'Reduced Planck constant',
    category: 'quantum',
    valueStr: '1.054571817 × 10⁻³⁴',
    unit: 'J·s',
    altValue: '6.582119569 × 10⁻¹⁶ eV·s',
  ),
  PhysicalConstant(
    symbol: 'h',
    latex: 'h',
    name: 'Planck constant',
    category: 'quantum',
    valueStr: '6.62607015 × 10⁻³⁴',
    unit: 'J·s',
    altValue: '4.135667696 × 10⁻¹⁵ eV·s',
  ),
  PhysicalConstant(
    symbol: 'e',
    latex: 'e',
    name: 'Elementary charge',
    category: 'electromagnetism',
    valueStr: '1.602176634 × 10⁻¹⁹',
    unit: 'C',
  ),
  PhysicalConstant(
    symbol: 'kB',
    latex: 'k_B',
    name: 'Boltzmann constant',
    category: 'thermodynamics',
    valueStr: '1.380649 × 10⁻²³',
    unit: 'J/K',
    altValue: '8.617333262 × 10⁻⁵ eV/K',
  ),
  PhysicalConstant(
    symbol: 'G',
    latex: 'G',
    name: 'Gravitational constant',
    category: 'astrophysics',
    valueStr: '6.67430 × 10⁻¹¹',
    unit: 'm³·kg⁻¹·s⁻²',
  ),
  PhysicalConstant(
    symbol: 'me',
    latex: 'm_e',
    name: 'Electron mass',
    category: 'quantum',
    valueStr: '9.1093837015 × 10⁻³¹',
    unit: 'kg',
    altValue: '0.510998950 MeV/c²',
  ),
  PhysicalConstant(
    symbol: 'mp',
    latex: 'm_p',
    name: 'Proton mass',
    category: 'quantum',
    valueStr: '1.67262192369 × 10⁻²⁷',
    unit: 'kg',
    altValue: '938.272088 MeV/c²',
  ),
  PhysicalConstant(
    symbol: 'ε₀',
    latex: r'\varepsilon_0',
    name: 'Vacuum electric permittivity',
    category: 'electromagnetism',
    valueStr: '8.8541878128 × 10⁻¹²',
    unit: 'F/m',
  ),
  PhysicalConstant(
    symbol: 'μ₀',
    latex: r'\mu_0',
    name: 'Vacuum magnetic permeability',
    category: 'electromagnetism',
    valueStr: '1.25663706212 × 10⁻⁶',
    unit: 'N/A²',
  ),
  PhysicalConstant(
    symbol: 'NA',
    latex: 'N_A',
    name: 'Avogadro constant',
    category: 'atomic',
    valueStr: '6.02214076 × 10²³',
    unit: 'mol⁻¹',
  ),
  PhysicalConstant(
    symbol: 'R',
    latex: 'R',
    name: 'Molar gas constant',
    category: 'thermodynamics',
    valueStr: '8.314462618',
    unit: 'J/(mol·K)',
  ),
  PhysicalConstant(
    symbol: 'σ',
    latex: r'\sigma',
    name: 'Stefan-Boltzmann constant',
    category: 'thermodynamics',
    valueStr: '5.670374419 × 10⁻⁸',
    unit: 'W/(m²·K⁴)',
  ),
  PhysicalConstant(
    symbol: 'α',
    latex: r'\alpha',
    name: 'Fine-structure constant',
    category: 'quantum',
    valueStr: '7.2973525693 × 10⁻³',
    unit: 'dimensionless',
    altValue: '≈ 1/137.035999',
  ),
];

class EquationItem {
  final String name;
  final String formulaLatex;
  final String renderedPretty;
  final String description;
  final String graphType;

  const EquationItem({
    required this.name,
    required this.formulaLatex,
    required this.renderedPretty,
    required this.description,
    required this.graphType,
  });
}

const List<EquationItem> physicsEquations = [
  EquationItem(
    name: 'Time-Dependent Schrödinger Equation',
    formulaLatex: r'i\hbar \frac{\partial}{\partial t}\Psi = \hat{H}\Psi',
    renderedPretty: r'i\hbar \frac{\partial}{\partial t}\Psi = \hat{H}\Psi',
    description: 'Quantum state evolution in non-relativistic quantum mechanics.',
    graphType: 'wavepacket',
  ),
  EquationItem(
    name: 'Einstein Mass-Energy-Momentum',
    formulaLatex: r'E = \sqrt{(pc)^2 + (m_0 c^2)^2}',
    renderedPretty: r'E = \sqrt{(pc)^2 + (m_0 c^2)^2}',
    description: 'Relativistic total energy combining rest mass and linear momentum.',
    graphType: 'hyperbola',
  ),
  EquationItem(
    name: 'Gauss Law for Electric Fields',
    formulaLatex: r'\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}',
    renderedPretty: r'\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}',
    description: 'Relates the electric flux divergence to the enclosed charge density.',
    graphType: 'field',
  ),
  EquationItem(
    name: 'Planck-Einstein Energy Relation',
    formulaLatex: r'E = h\nu = \hbar\omega',
    renderedPretty: r'E = h\nu = \hbar\omega',
    description: 'Energy quantization of photons as a function of frequency.',
    graphType: 'linear',
  ),
  EquationItem(
    name: 'Heisenberg Uncertainty Principle',
    formulaLatex: r'\Delta x \Delta p \geq \frac{\hbar}{2}',
    renderedPretty: r'\Delta x \Delta p \geq \frac{\hbar}{2}',
    description: 'Fundamental limit to precision between position and momentum.',
    graphType: 'uncertainty',
  ),
  EquationItem(
    name: 'Ideal Gas State Equation',
    formulaLatex: r'PV = nRT = N k_B T',
    renderedPretty: r'PV = nRT = N k_B T',
    description: 'Thermodynamic relationship between pressure, volume, and temperature.',
    graphType: 'isotherm',
  ),
  EquationItem(
    name: 'de Broglie Matter Wavelength',
    formulaLatex: r'\lambda = \frac{h}{p}',
    renderedPretty: r'\lambda = \frac{h}{p}',
    description: 'Wave-particle duality wavelength associated with massive particles.',
    graphType: 'inverse',
  ),
];

void showResearchSuiteModal(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => const _ResearchSuiteContent(),
  );
}

class _ResearchSuiteContent extends StatefulWidget {
  const _ResearchSuiteContent();

  @override
  State<_ResearchSuiteContent> createState() => _ResearchSuiteContentState();
}

class _ResearchSuiteContentState extends State<_ResearchSuiteContent> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedCat = 'All';
  String _search = '';
  final _evCtrl = TextEditingController(text: '1.0');
  double _evVal = 1.0;

  // Calculator State
  String _calcDisplay = '0';
  String _calcExpr = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _evCtrl.dispose();
    super.dispose();
  }

  void _copy(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied $label: $text'),
        backgroundColor: const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final dialogBg = isDark ? const Color(0xF513151F) : const Color(0xFAFFFFFF);
    final topBarBorder = isDark ? const Color(0xFF26293C) : const Color(0xFFE2E4EB);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (ctx, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: dialogBg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
                border: Border.all(color: topBarBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.12),
                    blurRadius: 32,
                    offset: const Offset(0, -6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // 1. Drag Grabber
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 10, bottom: 8),
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: mutedColor.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  // 2. Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6).withValues(alpha: isDark ? 0.2 : 0.12),
                            borderRadius: BorderRadius.circular(11),
                            border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.35)),
                          ),
                          child: const AtomIcon(size: 22, color: Color(0xFFA855F7), strokeWidth: 2.0),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Scientific Research Suite',
                                style: GoogleFonts.inter(
                                  color: textColor,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                'Constants, optics converter & math equations',
                                style: GoogleFonts.inter(
                                  color: mutedColor,
                                  fontSize: 11.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close_rounded, color: mutedColor, size: 20),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 10),

                  // 3. Apple Style Capsule Tab Bar
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1B1D2B) : const Color(0xFFECEEF4),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: topBarBorder),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: isDark ? const Color(0xFF2B2E42) : Colors.white,
                        borderRadius: BorderRadius.circular(11),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: isDark ? Colors.white : AppColors.lightInk,
                      unselectedLabelColor: mutedColor,
                      labelStyle: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w700),
                      unselectedLabelStyle: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w500),
                      tabs: const [
                        Tab(
                          height: 36,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                              SizedBox(width: 4),
                              Text('Constants'),
                            ],
                          ),
                        ),
                        Tab(
                          height: 36,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.bolt_rounded, size: 14, color: Color(0xFF38BDF8)),
                              SizedBox(width: 4),
                              Text('Optics'),
                            ],
                          ),
                        ),
                        Tab(
                          height: 36,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.show_chart_rounded, size: 14, color: Color(0xFFA855F7)),
                              SizedBox(width: 4),
                              Text('Equations'),
                            ],
                          ),
                        ),
                        Tab(
                          height: 36,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.calculate_rounded, size: 14, color: Color(0xFF10B981)),
                              SizedBox(width: 4),
                              Text('Calculator'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  // 4. Tab Views
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _buildConstantsTab(isDark, textColor, mutedColor),
                        _buildOpticsTab(isDark, textColor, mutedColor),
                        _buildEquationsTab(isDark, textColor, mutedColor),
                        _buildCalculatorTab(isDark, textColor, mutedColor),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==========================================
  // TAB 1: CONSTANTS
  // ==========================================
  Widget _buildConstantsTab(bool isDark, Color textColor, Color mutedColor) {
    final cats = ['All', 'quantum', 'electromagnetism', 'astrophysics', 'thermodynamics', 'atomic'];
    final cardBg = isDark ? const Color(0xFF1A1C28) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);
    final inputBg = isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F6);

    final filtered = physicalConstants.where((c) {
      final matchesCat = _selectedCat == 'All' || c.category == _selectedCat;
      final q = _search.toLowerCase().trim();
      final matchesQ = q.isEmpty ||
          c.name.toLowerCase().contains(q) ||
          c.symbol.toLowerCase().contains(q) ||
          c.valueStr.contains(q);
      return matchesCat && matchesQ;
    }).toList();

    return Column(
      children: [
        // Search Input
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            style: GoogleFonts.inter(color: textColor, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Search constants (e.g. Planck, c, kB)...',
              hintStyle: GoogleFonts.inter(color: mutedColor, fontSize: 12.5),
              prefixIcon: Icon(Icons.search_rounded, size: 18, color: mutedColor),
              filled: true,
              fillColor: inputBg,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: cardBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: cardBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
              ),
            ),
          ),
        ),

        // Category Filter Chips
        SizedBox(
          height: 34,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: cats.map((cat) {
              final active = _selectedCat == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: GestureDetector(
                  onTap: () => setState(() => _selectedCat = cat),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 130),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? AppColors.accent : inputBg,
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(
                        color: active ? AppColors.accent : cardBorder,
                      ),
                    ),
                    child: Text(
                      cat == 'All' ? 'All' : cat[0].toUpperCase() + cat.substring(1),
                      style: GoogleFonts.inter(
                        color: active ? Colors.white : mutedColor,
                        fontSize: 11.5,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 10),

        // Constant Cards List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            itemCount: filtered.length,
            itemBuilder: (ctx, i) {
              final c = filtered[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Symbol Badge with Serif Typography
                    Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFF8B5CF6).withValues(alpha: isDark ? 0.2 : 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.35)),
                      ),
                      child: Text(
                        c.symbol,
                        style: GoogleFonts.merriweather(
                          color: const Color(0xFFA78BFA),
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.name,
                            style: GoogleFonts.inter(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${c.valueStr} ${c.unit}',
                            style: GoogleFonts.jetBrainsMono(
                              color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (c.altValue != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              c.altValue!,
                              style: GoogleFonts.inter(color: mutedColor, fontSize: 11),
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.copy_rounded, size: 17, color: mutedColor),
                      tooltip: 'Copy value',
                      onPressed: () => _copy(c.valueStr, c.name),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ==========================================
  // TAB 2: OPTICS & ENERGY CONVERTER
  // ==========================================
  Widget _buildOpticsTab(bool isDark, Color textColor, Color mutedColor) {
    final h = 6.62607015e-34;
    final c = 299792458.0;
    final e = 1.602176634e-19;
    final kb = 1.380649e-23;

    final joules = _evVal * e;
    final nm = (_evVal > 0) ? (h * c / joules) * 1e9 : 0.0;
    final thz = (_evVal > 0) ? (joules / h) / 1e12 : 0.0;
    final kelvin = (_evVal > 0) ? (joules / kb) : 0.0;

    final cardBg = isDark ? const Color(0xFF1A1C28) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);
    final inputBg = isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F6);

    // Visible Spectrum Wavelength Color
    Color spectrumColor;
    if (nm >= 380 && nm <= 750) {
      if (nm < 440) {
        spectrumColor = const Color(0xFF8B5CF6); // Violet
      } else if (nm < 490) {
        spectrumColor = const Color(0xFF38BDF8); // Blue
      } else if (nm < 560) {
        spectrumColor = const Color(0xFF10B981); // Green
      } else if (nm < 590) {
        spectrumColor = const Color(0xFFFBBF24); // Yellow
      } else if (nm < 640) {
        spectrumColor = const Color(0xFFF97316); // Orange
      } else {
        spectrumColor = const Color(0xFFEF4444); // Red
      }
    } else if (nm < 380) {
      spectrumColor = const Color(0xFFA855F7); // Ultraviolet
    } else {
      spectrumColor = const Color(0xFFDC2626); // Infrared
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Input Energy Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'INPUT ENERGY (eV)',
                style: GoogleFonts.inter(
                  color: const Color(0xFF38BDF8),
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _evCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: GoogleFonts.jetBrainsMono(color: textColor, fontSize: 16, fontWeight: FontWeight.w700),
                decoration: InputDecoration(
                  hintText: 'Enter energy in electron-volts...',
                  hintStyle: GoogleFonts.inter(color: mutedColor, fontSize: 13),
                  filled: true,
                  fillColor: inputBg,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: cardBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: cardBorder)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.4)),
                ),
                onChanged: (v) {
                  final parsed = double.tryParse(v);
                  if (parsed != null && parsed >= 0) {
                    setState(() => _evVal = parsed);
                  }
                },
              ),
              const SizedBox(height: 12),
              // Preset Quick Buttons
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  _opticsPreset('Visible Blue (2.8 eV)', 2.8, inputBg, textColor, cardBorder),
                  _opticsPreset('Green (2.3 eV)', 2.3, inputBg, textColor, cardBorder),
                  _opticsPreset('Red (1.8 eV)', 1.8, inputBg, textColor, cardBorder),
                  _opticsPreset('Telecom IR (0.8 eV)', 0.8, inputBg, textColor, cardBorder),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Visual Spectrum Bar
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: spectrumColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: spectrumColor.withValues(alpha: 0.6), blurRadius: 10, spreadRadius: 1),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  nm >= 380 && nm <= 750
                      ? 'Visible Spectrum Photon (${nm.toStringAsFixed(1)} nm)'
                      : (nm < 380 ? 'Ultraviolet / High Energy (${nm.toStringAsFixed(2)} nm)' : 'Infrared / Thermal (${nm.toStringAsFixed(1)} nm)'),
                  style: GoogleFonts.inter(color: textColor, fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Converted Results
        _conversionCard('Wavelength (λ)', '${nm.toStringAsFixed(2)} nm', 'Wavelength', cardBg, cardBorder, textColor, mutedColor, isDark),
        _conversionCard('Frequency (f)', '${thz.toStringAsFixed(2)} THz', 'Frequency', cardBg, cardBorder, textColor, mutedColor, isDark),
        _conversionCard('Energy in Joules (J)', '${joules.toStringAsExponential(4)} J', 'Joules', cardBg, cardBorder, textColor, mutedColor, isDark),
        _conversionCard('Thermal Equivalent (K)', '${kelvin.toStringAsFixed(1)} K', 'Temperature', cardBg, cardBorder, textColor, mutedColor, isDark),
      ],
    );
  }

  Widget _opticsPreset(String label, double val, Color bg, Color textColor, Color border) {
    return GestureDetector(
      onTap: () {
        _evCtrl.text = val.toString();
        setState(() => _evVal = val);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(7), border: Border.all(color: border)),
        child: Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: textColor)),
      ),
    );
  }

  Widget _conversionCard(String title, String val, String copyLabel, Color cardBg, Color cardBorder, Color textColor, Color mutedColor, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.inter(color: mutedColor, fontSize: 11.5, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(val, style: GoogleFonts.jetBrainsMono(color: textColor, fontSize: 14.5, fontWeight: FontWeight.w700)),
            ],
          ),
          IconButton(
            icon: Icon(Icons.copy_rounded, size: 16, color: mutedColor),
            tooltip: 'Copy $copyLabel',
            onPressed: () => _copy(val, copyLabel),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 3: EQUATIONS (WITH RENDERED MATH & GRAPHS)
  // ==========================================
  Widget _buildEquationsTab(bool isDark, Color textColor, Color mutedColor) {
    final cardBg = isDark ? const Color(0xFF1A1C28) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      itemCount: physicsEquations.length,
      itemBuilder: (ctx, i) {
        final eq = physicsEquations[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.18 : 0.02),
                blurRadius: 6,
                offset: const Offset(0, 1.5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Equation Header & Name
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        eq.name,
                        style: GoogleFonts.inter(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFA855F7).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'PHYSICS',
                        style: GoogleFonts.inter(
                          color: const Color(0xFFA855F7),
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // RENDERED MATHEMATICAL FORMULA CARD (No Raw Purple Code!)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 12),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF13141E) : const Color(0xFFF9FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                alignment: Alignment.center,
                child: RenderedMathText(
                  text: '\$${eq.renderedPretty}\$',
                  style: GoogleFonts.merriweather(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                    fontStyle: FontStyle.italic,
                  ),
                  mathColor: isDark ? const Color(0xFFA78BFA) : const Color(0xFF7C3AED),
                ),
              ),

              // Interactive Visual Graph Canvas for the Equation
              Container(
                margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                height: 52,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF11121B) : const Color(0xFFF4F5F8),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: CustomPaint(
                  painter: _EquationGraphPainter(
                    graphType: eq.graphType,
                    isDark: isDark,
                  ),
                ),
              ),

              // Description & Action Row
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        eq.description,
                        style: GoogleFonts.inter(color: mutedColor, fontSize: 11.5),
                      ),
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                        foregroundColor: const Color(0xFFA855F7),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _copy(eq.formulaLatex, eq.name),
                      icon: const Icon(Icons.copy_rounded, size: 13),
                      label: Text('LaTeX', style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ==========================================
  // TAB 4: SCIENTIFIC CALCULATOR
  // ==========================================
  Widget _buildCalculatorTab(bool isDark, Color textColor, Color mutedColor) {
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);
    final keyBg = isDark ? const Color(0xFF222534) : const Color(0xFFF3F4F6);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Display Screen
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF11121C) : const Color(0xFFF8F9FA),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _calcExpr.isEmpty ? ' ' : _calcExpr,
                  style: GoogleFonts.jetBrainsMono(color: mutedColor, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  _calcDisplay,
                  style: GoogleFonts.jetBrainsMono(
                    color: textColor,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Keypad Matrix
          Expanded(
            child: GridView.count(
              crossAxisCount: 4,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 1.6,
              children: [
                _calcBtn('C', AppColors.danger, () => setState(() {
                  _calcDisplay = '0';
                  _calcExpr = '';
                })),
                _calcBtn('π', AppColors.accent, () => _inputNumber(math.pi.toStringAsFixed(6))),
                _calcBtn('e', AppColors.accent, () => _inputNumber(math.e.toStringAsFixed(6))),
                _calcBtn('÷', const Color(0xFF38BDF8), () => _inputOp('/')),

                _calcBtn('sin', textColor, () => _calcScientific('sin')),
                _calcBtn('cos', textColor, () => _calcScientific('cos')),
                _calcBtn('√', textColor, () => _calcScientific('sqrt')),
                _calcBtn('×', const Color(0xFF38BDF8), () => _inputOp('*')),

                _calcBtn('7', textColor, () => _inputNumber('7'), bg: keyBg),
                _calcBtn('8', textColor, () => _inputNumber('8'), bg: keyBg),
                _calcBtn('9', textColor, () => _inputNumber('9'), bg: keyBg),
                _calcBtn('−', const Color(0xFF38BDF8), () => _inputOp('-')),

                _calcBtn('4', textColor, () => _inputNumber('4'), bg: keyBg),
                _calcBtn('5', textColor, () => _inputNumber('5'), bg: keyBg),
                _calcBtn('6', textColor, () => _inputNumber('6'), bg: keyBg),
                _calcBtn('+', const Color(0xFF38BDF8), () => _inputOp('+')),

                _calcBtn('1', textColor, () => _inputNumber('1'), bg: keyBg),
                _calcBtn('2', textColor, () => _inputNumber('2'), bg: keyBg),
                _calcBtn('3', textColor, () => _inputNumber('3'), bg: keyBg),
                _calcBtn('=', Colors.white, _evalCalc, bg: AppColors.accent),

                _calcBtn('0', textColor, () => _inputNumber('0'), bg: keyBg),
                _calcBtn('.', textColor, () => _inputNumber('.'), bg: keyBg),
                _calcBtn('ln', textColor, () => _calcScientific('ln')),
                _calcBtn('x²', textColor, () => _calcScientific('sq')),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _inputNumber(String n) {
    setState(() {
      if (_calcDisplay == '0' && n != '.') {
        _calcDisplay = n;
      } else {
        _calcDisplay += n;
      }
    });
  }

  void _inputOp(String op) {
    setState(() {
      _calcExpr = '$_calcDisplay $op';
      _calcDisplay = '0';
    });
  }

  void _evalCalc() {
    final parts = _calcExpr.split(' ');
    if (parts.length < 2) return;
    final a = double.tryParse(parts[0]) ?? 0;
    final op = parts[1];
    final b = double.tryParse(_calcDisplay) ?? 0;

    double res = 0;
    if (op == '+') res = a + b;
    if (op == '-') res = a - b;
    if (op == '*') res = a * b;
    if (op == '/') res = b != 0 ? a / b : 0;

    setState(() {
      _calcExpr = '$a $op $b =';
      _calcDisplay = res.toStringAsFixed(res.truncateToDouble() == res ? 0 : 4);
    });
  }

  void _calcScientific(String type) {
    final val = double.tryParse(_calcDisplay) ?? 0;
    double res = val;
    if (type == 'sin') res = math.sin(val);
    if (type == 'cos') res = math.cos(val);
    if (type == 'sqrt') res = val >= 0 ? math.sqrt(val) : 0;
    if (type == 'ln') res = val > 0 ? math.log(val) : 0;
    if (type == 'sq') res = val * val;

    setState(() {
      _calcDisplay = res.toStringAsFixed(res.truncateToDouble() == res ? 0 : 4);
    });
  }

  Widget _calcBtn(String label, Color color, VoidCallback onTap, {Color? bg}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: bg ?? const Color(0xFF2B2E3E).withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            style: GoogleFonts.jetBrainsMono(
              color: color,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

/// Custom painter to draw clean mathematical curves and waveforms for physics equations.
class _EquationGraphPainter extends CustomPainter {
  final String graphType;
  final bool isDark;

  _EquationGraphPainter({required this.graphType, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final midY = h / 2;

    final axisPaint = Paint()
      ..color = (isDark ? Colors.white : Colors.black).withValues(alpha: 0.12)
      ..strokeWidth = 1;

    // Draw horizontal axis
    canvas.drawLine(Offset(10, midY), Offset(w - 10, midY), axisPaint);

    final linePaint = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [const Color(0xFF8B5CF6).withValues(alpha: 0.3), Colors.transparent],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, w, h));

    final path = Path();
    final fillPath = Path();

    if (graphType == 'wavepacket') {
      // Gaussian modulated sine wave
      path.moveTo(10, midY);
      fillPath.moveTo(10, midY);
      for (double x = 10; x <= w - 10; x += 2) {
        final t = (x - w / 2) / (w / 4);
        final envelope = math.exp(-t * t);
        final y = midY - (envelope * math.sin(t * 12) * (h * 0.4));
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
      fillPath.lineTo(w - 10, midY);
      canvas.drawPath(fillPath, fillPaint);
      canvas.drawPath(path, linePaint);
    } else if (graphType == 'hyperbola') {
      // Relativistic energy dispersion E = sqrt(p^2 + m^2)
      path.moveTo(10, h * 0.2);
      for (double x = 10; x <= w - 10; x += 2) {
        final t = (x - w / 2) / (w / 3);
        final y = midY - (math.sqrt(1 + t * t) - 1) * (h * 0.35) - 4;
        if (x == 10) path.moveTo(x, y);
        path.lineTo(x, y);
      }
      canvas.drawPath(path, linePaint);
    } else if (graphType == 'uncertainty' || graphType == 'inverse') {
      // 1/x curve
      path.moveTo(20, 8);
      for (double x = 20; x <= w - 10; x += 2) {
        final t = (x - 15) / (w - 20);
        final y = 8 + (h * 0.7) * (1 / (1 + t * 6));
        path.lineTo(x, y);
      }
      canvas.drawPath(path, linePaint);
    } else {
      // Sine / Wave dispersion
      path.moveTo(10, midY);
      for (double x = 10; x <= w - 10; x += 2) {
        final y = midY + math.sin((x / w) * math.pi * 4) * (h * 0.35);
        path.lineTo(x, y);
      }
      canvas.drawPath(path, linePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _EquationGraphPainter oldDelegate) => false;
}
