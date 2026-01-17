import React from 'react';
import { SolarSystemFlow } from './SolarSystemFlow';

interface Node {
    id: string;
    name: string;
    description: string;
    color: string;
    health?: number;
    is_central?: boolean;
    generates_revenue?: boolean;
}

interface Props {
    nodes: Node[];
}

/**
 * SolarSystemNode - Wrapper component for backward compatibility.
 * Internally uses the new React Flow-based SolarSystemFlow component.
 */
export const SolarSystemNode: React.FC<Props> = ({ nodes }) => {
    return <SolarSystemFlow nodes={nodes} />;
};
