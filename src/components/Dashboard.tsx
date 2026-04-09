import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { LogOut, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from './ui/input';
import { Label } from './ui/label';

type TransactionStatus = 'pending' | 'approved' | 'rejected';

interface Transaction {
  id: string;
  telegram_username: string;
  direction: 'zaad_to_edahab' | 'edahab_to_zaad';
  sender_currency: 'USD' | 'SHILIN';
  receiver_currency: 'USD' | 'SHILIN';
  amount_received: number;
  fee_amount: number;
  amount_to_send: number;
  sender_phone: string;
  receiver_phone: string;
  receiver_name: string;
  proof_screenshot_url: string;
  status: TransactionStatus;
  admin_notes: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { signOut } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TransactionStatus>('pending');
  
  // Modals state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState('');
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [transactionToReject, setTransactionToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchTransactions(); // Re-fetch on any change for simplicity
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch transactions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Transaction approved successfully');
      // Optimistic update
      setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'approved' } : t));
    } catch (error: any) {
      toast.error('Failed to approve: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!transactionToReject) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'rejected', 
          admin_notes: rejectReason 
        })
        .eq('id', transactionToReject);

      if (error) throw error;
      toast.success('Transaction rejected');
      
      // Optimistic update
      setTransactions(transactions.map(t => 
        t.id === transactionToReject 
          ? { ...t, status: 'rejected', admin_notes: rejectReason } 
          : t
      ));
      
      setRejectModalOpen(false);
      setRejectReason('');
      setTransactionToReject(null);
    } catch (error: any) {
      toast.error('Failed to reject: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id: string) => {
    setTransactionToReject(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const openProofModal = (url: string) => {
    setCurrentProofUrl(url);
    setProofModalOpen(true);
  };

  const filteredTransactions = transactions.filter(t => t.status === activeTab);
  
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const approvedCount = transactions.filter(t => t.status === 'approved').length;

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'SHILIN') {
      return new Intl.NumberFormat('en-US').format(amount) + ' SLSH';
    }
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (e) {
      return amount + ' ' + currency;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDirectionLabel = (direction: string) => {
    return direction === 'zaad_to_edahab' ? 'Zaad → e-Dahab' : 'e-Dahab → Zaad';
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Exchange Admin</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" onValueChange={(v) => setActiveTab(v as TransactionStatus)}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="relative">
                  Pending
                  {pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="bg-emerald-50/50 font-semibold text-emerald-700">To Send</TableHead>
                      <TableHead>Receiver Details</TableHead>
                      <TableHead>Proof</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                          Loading transactions...
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                          No {activeTab} transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap text-sm text-zinc-500">
                            {formatDate(tx.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">@{tx.telegram_username}</div>
                            <div className="text-xs text-zinc-500">{tx.sender_phone}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-zinc-100">
                              {getDirectionLabel(tx.direction)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(tx.amount_received, tx.sender_currency)}</div>
                            <div className="text-xs text-zinc-500">Fee: {formatCurrency(tx.fee_amount, tx.sender_currency)}</div>
                          </TableCell>
                          <TableCell className="bg-emerald-50/30">
                            <div className="font-bold text-emerald-700">
                              {formatCurrency(tx.amount_to_send, tx.receiver_currency)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{tx.receiver_name}</div>
                            <div className="text-sm text-zinc-600">{tx.receiver_phone}</div>
                          </TableCell>
                          <TableCell>
                            {tx.proof_screenshot_url ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openProofModal(tx.proof_screenshot_url)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-zinc-400">No proof</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.status === 'pending' ? (
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => openRejectModal(tx.id)}
                                  disabled={actionLoading}
                                >
                                  Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleApprove(tx.id)}
                                  disabled={actionLoading}
                                >
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <Badge 
                                variant={tx.status === 'approved' ? 'default' : 'destructive'}
                                className={tx.status === 'approved' ? 'bg-emerald-500' : ''}
                              >
                                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Proof Image Modal */}
      <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              Verify the receipt before approving the transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4 bg-zinc-100 rounded-md overflow-hidden">
            {currentProofUrl ? (
              <img 
                src={currentProofUrl} 
                alt="Payment Proof" 
                className="max-h-[60vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Not+Found';
                }}
              />
            ) : (
              <div className="text-zinc-500 py-12">No image available</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setProofModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transaction. This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Input
                id="reason"
                placeholder="e.g. Invalid receipt, amount mismatch..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
