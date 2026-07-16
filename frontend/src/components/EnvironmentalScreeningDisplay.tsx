import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Download,
  Droplet,
  Bird,
  Waves,
  Volume2,
  FileText,
  Scroll
} from 'lucide-react';

interface ScreeningData {
  wetlands: {
    found: boolean;
    count: number;
    risk_level: string;
    recommendation: string;
  };
  endangered_species: {
    found: boolean;
    count: number;
    risk_level: string;
    recommendation: string;
  };
  flood_zones: {
    in_flood_zone: boolean;
    zone_type: string;
    risk_level: string;
    recommendation: string;
  };
  noise_zones: {
    ordinances_found: number;
    risk_level: string;
    recommendation: string;
  };
  nepa: {
    required: boolean;
    risk_level: string;
    recommendation: string;
  };
  state_requirements: {
    found: boolean;
    count: number;
    risk_level: string;
    recommendation: string;
  };
}

interface EnvironmentalScreeningDisplayProps {
  data: {
    address: string;
    risk_level: string;
    synthesis: string;
    screening_data: ScreeningData;
  };
}

const getRiskColor = (risk: string) => {
  switch (risk?.toUpperCase()) {
    case 'HIGH':
      return 'text-red-600 bg-red-50';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-50';
    case 'LOW':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getRiskBadgeColor = (risk: string) => {
  switch (risk?.toUpperCase()) {
    case 'HIGH':
      return 'bg-red-200 text-red-800';
    case 'MEDIUM':
      return 'bg-yellow-200 text-yellow-800';
    case 'LOW':
      return 'bg-green-200 text-green-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

const ScreeningCategory: React.FC<{
  icon: React.ReactNode;
  title: string;
  risk: string;
  recommendation: string;
  details?: Record<string, any>;
}> = ({ icon, title, risk, recommendation, details }) => (
  <div className={`rounded-lg p-4 ${getRiskColor(risk)}`}>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeColor(risk)}`}>
            {risk}
          </span>
        </div>
        <p className="text-sm opacity-90">{recommendation}</p>
        {details && Object.keys(details).length > 0 && (
          <div className="mt-2 text-xs opacity-75 space-y-1">
            {Object.entries(details).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export const EnvironmentalScreeningDisplay: React.FC<EnvironmentalScreeningDisplayProps> = ({
  data
}) => {
  const screening = data.screening_data;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Environmental Screening Analysis</h1>
            <p className="text-sm text-gray-600 mt-1">{data.address}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold ${getRiskBadgeColor(data.risk_level)}`}>
            Overall Risk: {data.risk_level}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Executive Summary</h3>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{data.synthesis}</p>
          </div>
        </div>
      </div>

      {/* Individual Screening Categories */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Detailed Findings</h2>
        
        <ScreeningCategory
          icon={<Droplet size={20} />}
          title="Wetlands Assessment"
          risk={screening.wetlands.risk_level}
          recommendation={screening.wetlands.recommendation}
          details={{
            'Wetlands Found': screening.wetlands.found ? 'Yes' : 'No',
            'Count': screening.wetlands.count
          }}
        />

        <ScreeningCategory
          icon={<Bird size={20} />}
          title="Endangered & Threatened Species"
          risk={screening.endangered_species.risk_level}
          recommendation={screening.endangered_species.recommendation}
          details={{
            'Species Found': screening.endangered_species.found ? 'Yes' : 'No',
            'Count': screening.endangered_species.count
          }}
        />

        <ScreeningCategory
          icon={<Waves size={20} />}
          title="FEMA Flood Zone"
          risk={screening.flood_zones.risk_level}
          recommendation={screening.flood_zones.recommendation}
          details={{
            'In Flood Zone': screening.flood_zones.in_flood_zone ? 'Yes' : 'No',
            'Zone Type': screening.flood_zones.zone_type
          }}
        />

        <ScreeningCategory
          icon={<Volume2 size={20} />}
          title="Local Noise Ordinances"
          risk={screening.noise_zones.risk_level}
          recommendation={screening.noise_zones.recommendation}
          details={{
            'Ordinances Found': screening.noise_zones.ordinances_found
          }}
        />

        <ScreeningCategory
          icon={<FileText size={20} />}
          title="NEPA Requirements"
          risk={screening.nepa.risk_level}
          recommendation={screening.nepa.recommendation}
          details={{
            'NEPA Required': screening.nepa.required ? 'Yes' : 'No'
          }}
        />

        <ScreeningCategory
          icon={<Scroll size={20} />}
          title="State-Specific Requirements"
          risk={screening.state_requirements.risk_level}
          recommendation={screening.state_requirements.recommendation}
          details={{
            'Requirements Found': screening.state_requirements.found ? 'Yes' : 'No',
            'Count': screening.state_requirements.count
          }}
        />
      </div>

      {/* Risk Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Risk Summary by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Wetlands', level: screening.wetlands.risk_level },
            { label: 'Species', level: screening.endangered_species.risk_level },
            { label: 'Flood', level: screening.flood_zones.risk_level },
            { label: 'Noise', level: screening.noise_zones.risk_level },
            { label: 'NEPA', level: screening.nepa.risk_level },
            { label: 'State', level: screening.state_requirements.risk_level }
          ].map((item) => (
            <div
              key={item.label}
              className={`p-2 rounded text-sm font-medium text-center ${getRiskBadgeColor(item.level)}`}
            >
              <div className="text-xs opacity-75">{item.label}</div>
              <div>{item.level}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
        <h3 className="font-semibold text-indigo-900 mb-2">Recommended Next Steps</h3>
        <ul className="text-sm text-indigo-800 space-y-2">
          <li className="flex gap-2">
            <span className="flex-shrink-0">1.</span>
            <span>Review all findings above and cross-reference with your project plans</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0">2.</span>
            <span>
              {data.risk_level === 'HIGH'
                ? 'Engage environmental consultants immediately to address high-risk findings'
                : 'Consult with your team on any medium or high-risk items'}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0">3.</span>
            <span>Upgrade to the full RegGuard package for complete punch list and permit documentation</span>
          </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>Environmental screening powered by Firecrawl + Gemini synthesis</p>
        <p className="mt-1">
          This analysis is provided for informational purposes. Always consult with qualified environmental and legal professionals before making site decisions.
        </p>
      </div>
    </div>
  );
};

export default EnvironmentalScreeningDisplay;
