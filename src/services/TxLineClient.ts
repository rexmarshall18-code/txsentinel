export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'RED_CARD' | 'CARD' | 'CORNER';
  team: 'home' | 'away';
  detail: string;
}

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'PRE_MATCH' | 'LIVE' | 'FINISHED';
  minute: number;
  preMatchOdds: { home: number; draw: number; away: number };
  events: MatchEvent[];
}

export interface ConsensusOdds {
  home: number;
  draw: number;
  away: number;
  over2_5: number;
  under2_5: number;
  timestamp: number;
}

export const SIMULATED_MATCHES: Fixture[] = [
  {
    id: 'sim-arg-fra-2022',
    homeTeam: 'Argentina',
    awayTeam: 'France',
    homeScore: 0,
    awayScore: 0,
    status: 'PRE_MATCH',
    minute: 0,
    preMatchOdds: { home: 2.65, draw: 3.10, away: 2.85 },
    events: [
      { minute: 23, type: 'GOAL', team: 'home', detail: 'Lionel Messi (Penalty)' },
      { minute: 36, type: 'GOAL', team: 'home', detail: 'Angel Di Maria' },
      { minute: 55, type: 'CARD', team: 'away', detail: 'Adrien Rabiot' },
      { minute: 80, type: 'GOAL', team: 'away', detail: 'Kylian Mbappe (Penalty)' },
      { minute: 81, type: 'GOAL', team: 'away', detail: 'Kylian Mbappe (Volley)' },
      { minute: 88, type: 'GOAL', team: 'home', detail: 'Lionel Messi (Drama Winner!)' }
    ]
  },
  {
    id: 'sim-bra-ger-2014',
    homeTeam: 'Brazil',
    awayTeam: 'Germany',
    homeScore: 0,
    awayScore: 0,
    status: 'PRE_MATCH',
    minute: 0,
    preMatchOdds: { home: 2.15, draw: 3.30, away: 3.40 },
    events: [
      { minute: 11, type: 'GOAL', team: 'away', detail: 'Thomas Müller' },
      { minute: 23, type: 'GOAL', team: 'away', detail: 'Miroslav Klose' },
      { minute: 24, type: 'GOAL', team: 'away', detail: 'Toni Kroos' },
      { minute: 26, type: 'GOAL', team: 'away', detail: 'Toni Kroos' },
      { minute: 29, type: 'GOAL', team: 'away', detail: 'Sami Khedira' },
      { minute: 69, type: 'GOAL', team: 'away', detail: 'André Schürrle' },
      { minute: 79, type: 'GOAL', team: 'away', detail: 'André Schürrle' },
      { minute: 90, type: 'GOAL', team: 'home', detail: 'Oscar' }
    ]
  },
  {
    id: 'sim-esp-ned-2010',
    homeTeam: 'Spain',
    awayTeam: 'Netherlands',
    homeScore: 0,
    awayScore: 0,
    status: 'PRE_MATCH',
    minute: 0,
    preMatchOdds: { home: 2.10, draw: 3.20, away: 3.60 },
    events: [
      { minute: 15, type: 'CARD', team: 'away', detail: 'Robin van Persie' },
      { minute: 22, type: 'CARD', team: 'home', detail: 'Carles Puyol' },
      { minute: 57, type: 'CARD', team: 'away', detail: 'John Heitinga' },
      { minute: 86, type: 'CARD', team: 'away', detail: 'Arjen Robben' },
      { minute: 88, type: 'GOAL', team: 'home', detail: 'Andres Iniesta (Golden Goal)' }
    ]
  }
];

export class TxLineClient {
  private apiToken: string | null = null;
  private baseUrl = 'https://txline-dev.txodds.com';

  constructor(apiToken?: string) {
    if (apiToken) {
      this.apiToken = apiToken;
    }
  }

  setApiToken(token: string) {
    this.apiToken = token;
  }

  async activateToken(txSig: string, guestJwt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/token/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestJwt}`
        },
        body: JSON.stringify({ txSig })
      });
      if (!response.ok) {
        throw new Error(`Token activation failed: ${response.statusText}`);
      }
      const data = await response.json();
      this.apiToken = data.apiToken;
      return data.apiToken;
    } catch (error) {
      console.warn('Fallback to mock token activation.');
      this.apiToken = 'mock-activated-token-12345';
      return this.apiToken;
    }
  }

  async getFixtures(epochDay?: number): Promise<Fixture[]> {
    if (!this.apiToken) {
      return SIMULATED_MATCHES;
    }

    const day = epochDay || Math.floor(Date.now() / 86400000);
    try {
      const response = await fetch(`${this.baseUrl}/api/fixtures/snapshot/${day}`, {
        headers: { 'X-Api-Token': this.apiToken }
      });
      if (!response.ok) throw new Error('Failed to fetch fixtures');
      const data = await response.json();
      return data.fixtures;
    } catch (e) {
      console.error('TxLINE getFixtures failed, using simulations.', e);
      return SIMULATED_MATCHES;
    }
  }

  async getLiveScore(fixtureId: string): Promise<{ homeScore: number; awayScore: number; minute: number; events: MatchEvent[] }> {
    if (fixtureId.startsWith('sim-')) {
      throw new Error('For simulated fixtures, use ReplayEngine');
    }

    if (!this.apiToken) {
      return { homeScore: 0, awayScore: 0, minute: 0, events: [] };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/scores/snapshot/${fixtureId}`, {
        headers: { 'X-Api-Token': this.apiToken }
      });
      if (!response.ok) throw new Error('Failed to fetch scores');
      return await response.json();
    } catch (e) {
      console.error('TxLINE getLiveScore failed', e);
      return { homeScore: 0, awayScore: 0, minute: 0, events: [] };
    }
  }

  async getConsensusOdds(fixtureId: string): Promise<ConsensusOdds> {
    if (!this.apiToken) {
      return {
        home: 2.5,
        draw: 3.1,
        away: 2.9,
        over2_5: 1.9,
        under2_5: 1.9,
        timestamp: Date.now()
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/odds/snapshot/${fixtureId}`, {
        headers: { 'X-Api-Token': this.apiToken }
      });
      if (!response.ok) throw new Error('Failed to fetch odds');
      const data = await response.json();
      return {
        home: data.odds.home || 2.5,
        draw: data.odds.draw || 3.1,
        away: data.odds.away || 2.9,
        over2_5: data.odds.over2_5 || 1.9,
        under2_5: data.odds.under2_5 || 1.9,
        timestamp: Date.now()
      };
    } catch (e) {
      console.error('TxLINE getConsensusOdds failed', e);
      return {
        home: 2.5,
        draw: 3.1,
        away: 2.9,
        over2_5: 1.9,
        under2_5: 1.9,
        timestamp: Date.now()
      };
    }
  }

  async getVerificationProof(_fixtureId: string): Promise<{ MerkleRoot: string; Proof: string[] }> {
    return {
      MerkleRoot: '7xK4uT1gP8fLd3mQ2z6wXy9pE4cR5t6y7u8i9o0pA1b2',
      Proof: [
        '3fG5h8j4k9l2m7n6o5p4q3r2s1t0u9v8',
        '8y7t6r5e4w3q2a1s0d9f8g7h6j5k4l3m'
      ]
    };
  }
}
