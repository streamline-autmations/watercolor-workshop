import { useState, useEffect } from 'react';
import { useCourseInvites } from '@/hooks/useCourseInvites';
import { useAuth } from '@/hooks/useAuth';
import { courses } from '@/data/mock';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Plus, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Invite {
  id: string;
  course_id: string;
  email: string;
  token: string;
  expires_at: string;
  redeemed_at: string | null;
  created_at: string;
}

export default function AdminInvites() {
  const { user } = useAuth();
  const { createInvite, getInvites, revokeInvite, loading, error } = useCourseInvites();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [newInvite, setNewInvite] = useState<{ courseId: string; email: string; token: string; expiresAt: string } | null>(null);

  // Check if user is admin (you can implement your own admin check)
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('blom'); // Simple admin check

  useEffect(() => {
    if (isAdmin) {
      loadInvites();
    }
  }, [isAdmin]);

  const loadInvites = async () => {
    const data = await getInvites();
    setInvites(data);
  };

  const handleCreateInvite = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    const result = await createInvite(selectedCourse, email, expiresInDays);
    if (result) {
      setNewInvite({
        courseId: selectedCourse,
        email: email,
        token: result.token,
        expiresAt: result.expires_at
      });
      toast.success('Invite created successfully!');
      loadInvites();
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const success = await revokeInvite(inviteId);
    if (success) {
      toast.success('Invite revoked successfully!');
      loadInvites();
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/accept-invite?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite link copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCourseTitle = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || courseId;
  };

  const getStatusBadge = (invite: Invite) => {
    if (invite.redeemed_at) {
      return <Badge variant="secondary">Redeemed</Badge>;
    }
    
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    
    if (expiresAt < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bloom p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Course Invites</h1>
            <p className="text-gray-600">Manage course access invites</p>
          </div>
          <Button onClick={loadInvites} variant="outline">
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Create New Invite */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Create New Invite
            </CardTitle>
            <CardDescription>
              Generate a new invite link for a specific course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <Label htmlFor="expires">Expires In (Days)</Label>
                <Input
                  id="expires"
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateInvite} disabled={loading || !selectedCourse || !email} className="w-full">
                  {loading ? 'Creating...' : 'Create Invite'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Invite Created */}
        {newInvite && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Invite Created Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Course: {getCourseTitle(newInvite.courseId)}</Label>
                <Label>Email: {newInvite.email}</Label>
                <Label>Expires: {formatDate(newInvite.expiresAt)}</Label>
                <Label>Invite Link:</Label>
                <div className="flex space-x-2">
                  <Input
                    value={`${window.location.origin}/accept-invite?invite=${newInvite.token}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={() => copyInviteLink(newInvite.token)}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => setNewInvite(null)} variant="outline" size="sm">
                Close
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invites List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              All Invites
            </CardTitle>
            <CardDescription>
              Manage existing course invites
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No invites found</p>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{getCourseTitle(invite.course_id)}</span>
                        {getStatusBadge(invite)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Email: {invite.email}</div>
                        <div>Created: {formatDate(invite.created_at)}</div>
                        <div>Expires: {formatDate(invite.expires_at)}</div>
                        {invite.redeemed_at && <div>Redeemed: {formatDate(invite.redeemed_at)}</div>}
                      </div>
                      <div className="text-xs font-mono text-gray-500">
                        Token: {invite.token.substring(0, 8)}...
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => copyInviteLink(invite.token)}
                        size="sm"
                        variant="outline"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!invite.redeemed_at && (
                        <Button
                          onClick={() => handleRevokeInvite(invite.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
