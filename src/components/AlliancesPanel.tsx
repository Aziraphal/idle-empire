import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { AllianceRole } from "@prisma/client";

interface AlliancesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_ICONS = {
  [AllianceRole.LEADER]: "👑",
  [AllianceRole.OFFICER]: "🛡️", 
  [AllianceRole.MEMBER]: "🗡️",
};

const ROLE_NAMES = {
  [AllianceRole.LEADER]: "Chef",
  [AllianceRole.OFFICER]: "Officier",
  [AllianceRole.MEMBER]: "Membre",
};

const ROLE_COLORS = {
  [AllianceRole.LEADER]: "text-yellow-400",
  [AllianceRole.OFFICER]: "text-blue-400",
  [AllianceRole.MEMBER]: "text-stone-300",
};

export default function AlliancesPanel({ isOpen, onClose }: AlliancesPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invites' | 'browse' | 'create'>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Alliance data
  const { data: myAlliance, refetch: refetchMyAlliance } = trpc.alliances.getMyAlliance.useQuery(
    undefined,
    { enabled: isOpen }
  );
  
  const { data: myInvitations, refetch: refetchInvitations } = trpc.alliances.getMyInvitations.useQuery(
    undefined,
    { enabled: isOpen }
  );
  
  const { data: publicAlliances } = trpc.alliances.getPublicAlliances.useQuery(
    { limit: 20 },
    { enabled: isOpen && activeTab === 'browse' }
  );
  
  const { data: searchResults } = trpc.alliances.searchAlliances.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length >= 2 }
  );

  // Mutations
  const createAllianceMutation = trpc.alliances.createAlliance.useMutation({
    onSuccess: () => {
      refetchMyAlliance();
      setShowCreateForm(false);
      setActiveTab('overview');
    },
  });

  const respondToInvitationMutation = trpc.alliances.respondToInvitation.useMutation({
    onSuccess: () => {
      refetchInvitations();
      refetchMyAlliance();
    },
  });

  const inviteUserMutation = trpc.alliances.inviteUser.useMutation({
    onSuccess: () => {
      // Reset form or show success message
    },
  });

  const leaveAllianceMutation = trpc.alliances.leaveAlliance.useMutation({
    onSuccess: () => {
      refetchMyAlliance();
    },
  });

  const kickMemberMutation = trpc.alliances.kickMember.useMutation({
    onSuccess: () => {
      refetchMyAlliance();
    },
  });

  const changeRoleMutation = trpc.alliances.changeRole.useMutation({
    onSuccess: () => {
      refetchMyAlliance();
    },
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    description: '',
    isPublic: true,
    maxMembers: 50,
    minLevel: 1,
  });

  const [inviteForm, setInviteForm] = useState({
    username: '',
    message: '',
  });

  const handleCreateAlliance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAllianceMutation.mutateAsync(createForm);
    } catch (error) {
      console.error('Failed to create alliance:', error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteUserMutation.mutateAsync(inviteForm);
      setInviteForm({ username: '', message: '' });
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleRespondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      await respondToInvitationMutation.mutateAsync({ invitationId, accept });
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  };

  const canManageMembers = myAlliance && (
    myAlliance.role === AllianceRole.LEADER || 
    myAlliance.role === AllianceRole.OFFICER
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-stone-600">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-empire-gold flex items-center gap-2">
              🏰 Alliances
            </h2>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'overview'
                  ? 'bg-empire-gold text-stone-900'
                  : 'text-stone-300 hover:text-white border border-stone-600'
              }`}
            >
              🏰 Mon Alliance
            </button>
            
            {myInvitations && myInvitations.length > 0 && (
              <button
                onClick={() => setActiveTab('invites')}
                className={`px-4 py-2 rounded transition-colors relative ${
                  activeTab === 'invites'
                    ? 'bg-empire-gold text-stone-900'
                    : 'text-stone-300 hover:text-white border border-stone-600'
                }`}
              >
                📨 Invitations
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {myInvitations.length}
                </span>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'browse'
                  ? 'bg-empire-gold text-stone-900'
                  : 'text-stone-300 hover:text-white border border-stone-600'
              }`}
            >
              🔍 Parcourir
            </button>
            
            {!myAlliance && (
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded transition-colors ${
                  activeTab === 'create'
                    ? 'bg-empire-gold text-stone-900'
                    : 'text-stone-300 hover:text-white border border-stone-600'
                }`}
              >
                ➕ Créer
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* My Alliance Tab */}
          {activeTab === 'overview' && (
            <>
              {!myAlliance ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏰</div>
                  <h3 className="text-xl text-stone-300 mb-2">Aucune Alliance</h3>
                  <p className="text-stone-500 mb-4">
                    Vous n'appartenez à aucune alliance. Rejoignez-en une ou créez la vôtre !
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="btn-primary"
                    >
                      🔍 Parcourir les Alliances
                    </button>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="btn-secondary"
                    >
                      ➕ Créer une Alliance
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Alliance Header */}
                  <div className="bg-gradient-to-r from-empire-gold to-empire-bronze rounded-lg p-6 text-stone-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-3xl font-bold flex items-center gap-2">
                          {myAlliance.alliance.name}
                          <span className="text-lg opacity-80">[{myAlliance.alliance.tag}]</span>
                        </h3>
                        {myAlliance.alliance.description && (
                          <p className="mt-2 opacity-90">{myAlliance.alliance.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl ${ROLE_COLORS[myAlliance.role]}`}>
                          {ROLE_ICONS[myAlliance.role]} {ROLE_NAMES[myAlliance.role]}
                        </div>
                        <div className="text-sm opacity-80">
                          Membre depuis {new Date(myAlliance.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alliance Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-stone-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-empire-gold">
                        {myAlliance.alliance.memberCount}/{myAlliance.alliance.maxMembers}
                      </div>
                      <div className="text-sm text-stone-400">Membres</div>
                    </div>
                    <div className="bg-stone-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {myAlliance.alliance.totalPowerFormatted}
                      </div>
                      <div className="text-sm text-stone-400">Puissance</div>
                    </div>
                    <div className="bg-stone-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {myAlliance.alliance.avgLevel.toFixed(1)}
                      </div>
                      <div className="text-sm text-stone-400">Niveau Moyen</div>
                    </div>
                    <div className="bg-stone-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {myAlliance.alliance.isPublic ? "Publique" : "Privée"}
                      </div>
                      <div className="text-sm text-stone-400">Visibilité</div>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="bg-stone-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">👥 Membres</h4>
                      {canManageMembers && (
                        <div className="flex gap-2">
                          <form onSubmit={handleInviteUser} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nom d'utilisateur"
                              value={inviteForm.username}
                              onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })}
                              className="input text-sm"
                              required
                            />
                            <button
                              type="submit"
                              disabled={inviteUserMutation.isLoading}
                              className="btn-primary text-sm"
                            >
                              {inviteUserMutation.isLoading ? "..." : "📨 Inviter"}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {myAlliance.alliance.members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 bg-stone-600 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xl ${ROLE_COLORS[member.role]}`}>
                              {ROLE_ICONS[member.role]}
                            </span>
                            <div>
                              <div className="font-semibold text-empire-gold">
                                {member.user.username}
                              </div>
                              <div className="text-xs text-stone-400">
                                {ROLE_NAMES[member.role]} • 
                                Rejoint le {new Date(member.joinedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          {canManageMembers && member.userId !== myAlliance.userId && (
                            <div className="flex gap-2">
                              {myAlliance.role === AllianceRole.LEADER && (
                                <>
                                  <button
                                    onClick={() => changeRoleMutation.mutate({
                                      targetUserId: member.userId,
                                      newRole: member.role === AllianceRole.OFFICER ? AllianceRole.MEMBER : AllianceRole.OFFICER
                                    })}
                                    className="btn-secondary text-xs"
                                    disabled={changeRoleMutation.isLoading}
                                  >
                                    {member.role === AllianceRole.OFFICER ? "⬇️ Rétrograder" : "⬆️ Promouvoir"}
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => kickMemberMutation.mutate({
                                  targetUserId: member.userId,
                                  reason: "Exclu par un dirigeant"
                                })}
                                className="btn-secondary bg-red-600 hover:bg-red-700 text-xs"
                                disabled={kickMemberMutation.isLoading}
                              >
                                👢 Exclure
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alliance Activities */}
                  {(myAlliance.alliance as any).activities && (myAlliance.alliance as any).activities.length > 0 && (
                    <div className="bg-stone-700 rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">📰 Activités Récentes</h4>
                      <div className="space-y-2">
                        {(myAlliance.alliance as any).activities.slice(0, 5).map((activity: any) => (
                          <div key={activity.id} className="text-sm text-stone-300 p-2 bg-stone-600 rounded">
                            <span className="text-stone-500">
                              {new Date(activity.createdAt).toLocaleDateString()} -
                            </span>
                            {" " + activity.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leave Alliance */}
                  <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-400 mb-2">⚠️ Zone Dangereuse</h4>
                    <p className="text-stone-300 text-sm mb-3">
                      Quitter l'alliance vous empêchera d'accéder aux fonctionnalités d'alliance.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm("Êtes-vous sûr de vouloir quitter cette alliance ?")) {
                          leaveAllianceMutation.mutate();
                        }
                      }}
                      disabled={leaveAllianceMutation.isLoading}
                      className="btn-secondary bg-red-600 hover:bg-red-700 text-sm"
                    >
                      {leaveAllianceMutation.isLoading ? "En cours..." : "🚪 Quitter l'Alliance"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invites' && (
            <>
              {!myInvitations || myInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📨</div>
                  <h3 className="text-xl text-stone-300 mb-2">Aucune Invitation</h3>
                  <p className="text-stone-500">Vous n'avez reçu aucune invitation d'alliance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">📨 Invitations Reçues</h3>
                  {myInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="border border-stone-600 rounded-lg p-6 bg-stone-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-empire-gold">
                            {invitation.alliance.name} [{invitation.alliance.tag}]
                          </h4>
                          <p className="text-stone-400 text-sm">
                            Invité par {invitation.sender.username}
                          </p>
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-stone-500">Membres:</span>
                              <span className="ml-1">{invitation.alliance.memberCount}/{invitation.alliance.maxMembers}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Puissance:</span>
                              <span className="ml-1">{Number(invitation.alliance.totalPower).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-stone-500">Expire:</span>
                              <span className="ml-1">{new Date(invitation.expiresAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {invitation.message && (
                            <div className="mt-3 p-3 bg-stone-600 rounded text-sm">
                              <span className="text-stone-500">Message:</span>
                              <p className="mt-1">{invitation.message}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleRespondToInvitation(invitation.id, true)}
                            disabled={respondToInvitationMutation.isLoading}
                            className="btn-primary bg-green-600 hover:bg-green-700"
                          >
                            ✅ Accepter
                          </button>
                          <button
                            onClick={() => handleRespondToInvitation(invitation.id, false)}
                            disabled={respondToInvitationMutation.isLoading}
                            className="btn-secondary bg-red-600 hover:bg-red-700"
                          >
                            ❌ Décliner
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Rechercher des alliances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Search Results or Public Alliances */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">
                  {searchQuery ? `Résultats pour "${searchQuery}"` : "Alliances Publiques"}
                </h3>
                
                {(searchQuery ? searchResults : publicAlliances)?.map((alliance) => (
                  <div
                    key={alliance.id}
                    className="border border-stone-600 rounded-lg p-4 bg-stone-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-empire-gold">
                          {alliance.name} [{alliance.tag}]
                        </h4>
                        {alliance.description && (
                          <p className="text-stone-400 text-sm mt-1">{alliance.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>👥 {alliance.memberCount}/{alliance.maxMembers}</span>
                          <span>⚡ {alliance.totalPowerFormatted}</span>
                          <span>👑 {alliance.leader.username}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-stone-500 mb-2">
                          Créée le {new Date(alliance.createdAt).toLocaleDateString()}
                        </div>
                        {/* Would add request to join functionality here */}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <p className="text-stone-400">
                      {searchQuery ? "Aucune alliance trouvée." : "Chargement des alliances..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && !myAlliance && (
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-6">➕ Créer une Nouvelle Alliance</h3>
              
              <form onSubmit={handleCreateAlliance} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom de l'Alliance *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="input w-full"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tag (2-6 caractères) *</label>
                  <input
                    type="text"
                    value={createForm.tag}
                    onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                    className="input w-full"
                    required
                    minLength={2}
                    maxLength={6}
                    pattern="[A-Z0-9]+"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="input w-full h-20"
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Membres Maximum</label>
                    <input
                      type="number"
                      value={createForm.maxMembers}
                      onChange={(e) => setCreateForm({ ...createForm, maxMembers: parseInt(e.target.value) })}
                      className="input w-full"
                      min={5}
                      max={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Niveau Minimum</label>
                    <input
                      type="number"
                      value={createForm.minLevel}
                      onChange={(e) => setCreateForm({ ...createForm, minLevel: parseInt(e.target.value) })}
                      className="input w-full"
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createForm.isPublic}
                      onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Alliance publique (visible dans les recherches)</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={createAllianceMutation.isLoading}
                    className="btn-primary flex-1"
                  >
                    {createAllianceMutation.isLoading ? "Création..." : "🏰 Créer l'Alliance"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}