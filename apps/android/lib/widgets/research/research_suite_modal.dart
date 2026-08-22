import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/app_theme.dart';

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
    symbol: 'ε0',
    latex: r'\varepsilon_0',
    name: 'Vacuum electric permittivity',
    category: 'electromagnetism',
    valueStr: '8.8541878128 × 10⁻¹²',
    unit: 'F/m',
  ),
  PhysicalConstant(
    symbol: 'μ0',
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

void showResearchSuiteModal(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.panel,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => const ResearchSuiteModal(),
  );
}

class ResearchSuiteModal extends StatefulWidget {
  const ResearchSuiteModal({super.key});

  @override
  State<ResearchSuiteModal> createState() => _ResearchSuiteModalState();
}

class _ResearchSuiteModalState extends State<ResearchSuiteModal> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String _search = '';
  String _selectedCat = 'All';

  // Optics converter state
  double _evVal = 1.0;
  final _evCtrl = TextEditingController(text: '1.0');

  // Calculator state
  String _calcDisplay = '0';
  String _calcExpr = '';

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _evCtrl.dispose();
    super.dispose();
  }

  void _copy(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Copied $label: $text'), duration: const Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.hub_outlined, color: AppColors.accent, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Scientific Research Suite', style: TextStyle(color: AppColors.ink, fontSize: 16, fontWeight: FontWeight.w700)),
                      Text('Constants, optics converter & calculator', style: TextStyle(color: AppColors.ink3, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(icon: const Icon(Icons.close, color: AppColors.ink3), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          TabBar(
            controller: _tabCtrl,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: AppColors.accent,
            unselectedLabelColor: AppColors.ink3,
            indicatorColor: AppColors.accent,
            tabs: const [
              Tab(icon: Icon(Icons.star_outline, size: 18), text: 'Constants'),
              Tab(icon: Icon(Icons.bolt_outlined, size: 18), text: 'Energy & Optics'),
              Tab(icon: Icon(Icons.show_chart, size: 18), text: 'Equations'),
              Tab(icon: Icon(Icons.calculate_outlined, size: 18), text: 'Calculator'),
            ],
          ),
          const Divider(height: 1, color: AppColors.line),
          Expanded(
            child: TabBarView(
              controller: _tabCtrl,
              children: [
                _buildConstantsTab(),
                _buildOpticsTab(),
                _buildEquationsTab(),
                _buildCalculatorTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConstantsTab() {
    final cats = ['All', 'quantum', 'electromagnetism', 'astrophysics', 'thermodynamics', 'atomic'];
    final filtered = physicalConstants.where((c) {
      final matchesCat = _selectedCat == 'All' || c.category == _selectedCat;
      final q = _search.toLowerCase().trim();
      final matchesQ = q.isEmpty || c.name.toLowerCase().contains(q) || c.symbol.toLowerCase().contains(q) || c.valueStr.contains(q);
      return matchesCat && matchesQ;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Search constants (e.g. Planck, c, kB)...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.ink3),
              filled: true,
              fillColor: AppColors.panel2,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            ),
          ),
        ),
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: cats.map((cat) {
              final active = _selectedCat == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(cat == 'All' ? 'All' : cat[0].toUpperCase() + cat.substring(1)),
                  selected: active,
                  onSelected: (_) => setState(() => _selectedCat = cat),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: filtered.length,
            itemBuilder: (ctx, i) {
              final c = filtered[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.panel2,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(c.symbol, style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.name, style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w600, fontSize: 14)),
                          const SizedBox(height: 2),
                          Text('${c.valueStr} ${c.unit}', style: const TextStyle(color: AppColors.muted, fontSize: 12, fontFamily: 'monospace')),
                          if (c.altValue != null)
                            Text(c.altValue!, style: const TextStyle(color: AppColors.ink3, fontSize: 11)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 16, color: AppColors.ink3),
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

  Widget _buildOpticsTab() {
    final h = 6.62607015e-34;
    final c = 299792458.0;
    final e = 1.602176634e-19;
    final kb = 1.380649e-23;

    final joules = _evVal * e;
    final nm = (_evVal > 0) ? (h * c / joules) * 1e9 : 0.0;
    final thz = (_evVal > 0) ? (joules / h) / 1e12 : 0.0;
    final kelvin = (_evVal > 0) ? (joules / kb) : 0.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Energy / Wavelength / Frequency Converter', style: TextStyle(color: AppColors.ink, fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 12),
        TextField(
          controller: _evCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: 'Energy (eV)', border: OutlineInputBorder()),
          onChanged: (v) {
            final parsed = double.tryParse(v);
            if (parsed != null && parsed >= 0) {
              setState(() => _evVal = parsed);
            }
          },
        ),
        const SizedBox(height: 16),
        _conversionRow('Wavelength (λ)', '${nm.toStringAsFixed(2)} nm', () => _copy('${nm.toStringAsFixed(2)} nm', 'Wavelength')),
        _conversionRow('Frequency (f)', '${thz.toStringAsFixed(2)} THz', () => _copy('${thz.toStringAsFixed(2)} THz', 'Frequency')),
        _conversionRow('Energy (Joules)', '${joules.toStringAsExponential(4)} J', () => _copy('${joules.toStringAsExponential(4)} J', 'Joules')),
        _conversionRow('Thermal Temp (E=k_B T)', '${kelvin.toStringAsFixed(1)} K', () => _copy('${kelvin.toStringAsFixed(1)} K', 'Temperature')),
      ],
    );
  }

  Widget _conversionRow(String title, String val, VoidCallback onCopy) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.line)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: AppColors.ink3, fontSize: 12)),
              Text(val, style: const TextStyle(color: AppColors.ink, fontSize: 15, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
            ],
          ),
          IconButton(icon: const Icon(Icons.copy, size: 16, color: AppColors.ink3), onPressed: onCopy),
        ],
      ),
    );
  }

  Widget _buildEquationsTab() {
    final eqList = [
      {'name': 'Time-Dependent Schrödinger Equation', 'latex': r'i\hbar \frac{\partial}{\partial t}\Psi = \hat{H}\Psi'},
      {'name': 'Einstein Mass-Energy Equivalence', 'latex': r'E = \sqrt{(pc)^2 + (m_0 c^2)^2}'},
      {'name': 'Maxwell Equations (Gauss Law)', 'latex': r'\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}'},
      {'name': 'Planck-Einstein Relation', 'latex': r'E = h\nu = \hbar\omega'},
      {'name': 'Heisenberg Uncertainty Principle', 'latex': r'\Delta x \Delta p \ge \frac{\hbar}{2}'},
      {'name': 'Ideal Gas Law', 'latex': r'PV = nRT = N k_B T'},
      {'name': 'de Broglie Wavelength', 'latex': r'\lambda = \frac{h}{p}'},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: eqList.length,
      itemBuilder: (ctx, i) {
        final eq = eqList[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.line)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(eq['name']!, style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppColors.panel, borderRadius: BorderRadius.circular(8)),
                child: Text(eq['latex']!, style: const TextStyle(color: AppColors.accent, fontFamily: 'monospace', fontSize: 13)),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _copy('\$${eq['latex']!}\$', 'LaTeX equation'),
                    icon: const Icon(Icons.copy, size: 14),
                    label: const Text('Copy LaTeX', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCalculatorTab() {
    final buttons = [
      ['C', '(', ')', '/'],
      ['7', '8', '9', '*'],
      ['4', '5', '6', '-'],
      ['1', '2', '3', '+'],
      ['0', '.', 'π', '='],
      ['sin', 'cos', 'sqrt', '^'],
    ];

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          color: AppColors.panel2,
          alignment: Alignment.centerRight,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(_calcExpr.isEmpty ? '0' : _calcExpr, style: const TextStyle(color: AppColors.ink3, fontSize: 14)),
              const SizedBox(height: 4),
              Text(_calcDisplay, style: const TextStyle(color: AppColors.ink, fontSize: 28, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 4, childAspectRatio: 1.6, crossAxisSpacing: 8, mainAxisSpacing: 8),
              itemCount: buttons.expand((r) => r).length,
              itemBuilder: (ctx, i) {
                final list = buttons.expand((r) => r).toList();
                final text = list[i];
                final isOp = ['/', '*', '-', '+', '=', '^'].contains(text);
                final isFunc = ['sin', 'cos', 'sqrt', 'C', '(', ')'].contains(text);

                return InkWell(
                  onTap: () => _onCalcKey(text),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isOp ? AppColors.accent : (isFunc ? AppColors.panel2 : AppColors.panel),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.line),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      text,
                      style: TextStyle(
                        color: isOp ? Colors.white : AppColors.ink,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  void _onCalcKey(String key) {
    setState(() {
      if (key == 'C') {
        _calcDisplay = '0';
        _calcExpr = '';
      } else if (key == '=') {
        _evaluateCalc();
      } else if (key == 'π') {
        _calcExpr += math.pi.toString();
        _calcDisplay = math.pi.toStringAsFixed(6);
      } else if (key == 'sqrt') {
        _calcExpr += 'sqrt(';
      } else if (key == 'sin') {
        _calcExpr += 'sin(';
      } else if (key == 'cos') {
        _calcExpr += 'cos(';
      } else {
        _calcExpr += key;
        _calcDisplay = _calcExpr;
      }
    });
  }

  void _evaluateCalc() {
    try {
      // Basic expression evaluator for simple numbers and math
      var expr = _calcExpr;
      if (expr.isEmpty) return;
      if (expr.contains('+')) {
        final p = expr.split('+');
        final r = p.map((s) => double.parse(s.trim())).reduce((a, b) => a + b);
        _calcDisplay = r.toString();
      } else if (expr.contains('-')) {
        final p = expr.split('-');
        final r = p.map((s) => double.parse(s.trim())).reduce((a, b) => a - b);
        _calcDisplay = r.toString();
      } else if (expr.contains('*')) {
        final p = expr.split('*');
        final r = p.map((s) => double.parse(s.trim())).reduce((a, b) => a * b);
        _calcDisplay = r.toString();
      } else if (expr.contains('/')) {
        final p = expr.split('/');
        final r = p.map((s) => double.parse(s.trim())).reduce((a, b) => a / b);
        _calcDisplay = r.toString();
      } else if (expr.contains('^')) {
        final p = expr.split('^');
        final r = math.pow(double.parse(p[0]), double.parse(p[1]));
        _calcDisplay = r.toString();
      } else {
        final parsed = double.tryParse(expr);
        if (parsed != null) _calcDisplay = parsed.toString();
      }
    } catch (_) {
      _calcDisplay = 'Error';
    }
  }
}
