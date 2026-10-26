import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Check, X, Image as ImageIcon, Trash2, Power, Pause, Play, Plus, Users } from "lucide-react";
import { uploadToImageKit } from "@/lib/imagekit";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsAndAdsAdmin,
});

function ReviewsAndAdsAdmin() {
  const queryClient = useQueryClient();

  const { data: reviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: ads } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review approved");
    },
  });

  const toggleAdMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("app_ads").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Ad status updated");
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Ad deleted");
    },
  });

  const [adPhoto, setAdPhoto] = useState<File | null>(null);
  const [adLink, setAdLink] = useState("");
  const [adHours, setAdHours] = useState("");

  const createAdMutation = useMutation({
    mutationFn: async () => {
      if (!adPhoto) throw new Error("Choose a photo first");
      const url = await uploadToImageKit(adPhoto, "/ads");
      const hours = Number(adHours);
      const expires_at =
        adHours && hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
      const base: any = {
        title: adPhoto.name.replace(/\.[^.]+$/, "") || "Home Page Ad",
        image_url: url,
        target_link: adLink || null,
        is_active: true,
      };
      if (expires_at) base.expires_at = expires_at;
      // Save the ad, ignoring columns the connected database does not have yet
      // (e.g. expires_at, before the time-limit column is added).
      let saved = base;
      for (let i = 0; i < 4; i++) {
        const { error } = await supabase.from("app_ads").insert(saved);
        if (!error) break;
        const m = /'([^']+)' column of 'app_ads'/.exec(error.message || "");
        if (error.code === "PGRST204" && m && m[1] in saved) {
          delete saved[m[1]];
          continue;
        }
        throw error;
      }
      return expires_at === null ? true : "expires_at" in saved;
    },
    onSuccess: (timedSupported) => {
      setAdPhoto(null);
      setAdLink("");
      setAdHours("");
      const input = document.getElementById("ad-photo-input") as HTMLInputElement | null;
      if (input) input.value = "";
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      if (timedSupported === false) {
        toast.info("Ad uploaded, but the time limit option needs a database update first");
      } else {
        toast.success("Ad uploaded");
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reviews Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Student Reviews</h2>
            <p className="text-slate-500 font-medium text-sm">Approve student reviews before they show on the website.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
            {reviews?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium italic">No reviews yet.</div>
            ) : (
              reviews?.map((review) => (
                <div key={review.id} className="p-6 hover:bg-slate-50 transition group">
                   <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                           <Users size={18} className="text-slate-400" />
                         </div>
                         <div>
                             <p className="font-bold text-slate-900">{(review as any).profiles?.full_name || "Student"}</p>
                            <div className="flex items-center gap-1 text-amber-400">
                               {[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {!review.is_approved && (
                           <button 
                             onClick={() => approveReviewMutation.mutate(review.id)}
                             className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition"
                           >
                             <Check size={18} />
                           </button>
                         )}
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                           review.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                         }`}>
                           {review.is_approved ? 'approved' : 'pending'}
                         </span>
                      </div>
                   </div>
                    <p className="mt-4 text-slate-600 text-sm leading-relaxed italic">"{review.comment}"</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ads Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Interstitial Ads</h2>
            <p className="text-slate-500 font-medium text-sm">Upload a photo, turn it on or off, delete it, or set how long it runs. It shows once on the home page.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Ad Photo</label>
              <input
                id="ad-photo-input"
                type="file"
                accept="image/*"
                onChange={(e) => setAdPhoto(e.target.files?.[0] ?? null)}
                className="w-full text-sm font-medium text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-slate-50 file:text-slate-700 file:font-bold file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Link URL (optional)</label>
              <input
                type="text"
                value={adLink}
                onChange={(e) => setAdLink(e.target.value)}
                placeholder="Where should tapping the ad go?"
                className="w-full p-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Show for how many hours (optional)</label>
              <input
                type="number"
                min={1}
                value={adHours}
                onChange={(e) => setAdHours(e.target.value)}
                placeholder="Leave empty to keep it until you pause or delete it"
                className="w-full p-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
              />
            </div>
            <button
              onClick={() => createAdMutation.mutate()}
              disabled={!adPhoto || createAdMutation.isPending}
              className="w-full py-3.5 bg-brand text-white rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {createAdMutation.isPending ? "Uploading..." : "Upload Ad"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {ads?.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 italic">
                No ads configured.
              </div>
            ) : (
              ads?.map((ad) => (
                <div key={ad.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition">
                   <div className="w-24 aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                      {ad.image_url ? (
                        <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} />
                        </div>
                      )}
                   </div>
                   <div className="flex-1">
                       <p className="font-bold text-slate-900 mb-1">{ad.title || ad.id.split('-')[0] || "Untitled Ad"}</p>
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                           ad.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                         }`}>
                           {ad.is_active ? 'Active' : 'Paused'}
                         </span>
                         {ad.target_link && <p className="text-xs text-brand truncate max-w-[150px]">{ad.target_link}</p>}
                      </div>
                      {(ad as any).expires_at && (
                        <p className={`text-xs mt-1 font-medium ${new Date((ad as any).expires_at) > new Date() ? 'text-slate-400' : 'text-rose-500'}`}>
                          {new Date((ad as any).expires_at) > new Date()
                            ? `Shows until ${new Date((ad as any).expires_at).toLocaleString()}`
                            : 'Expired'}
                        </p>
                      )}
                   </div>
                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button 
                         onClick={() => toggleAdMutation.mutate({ id: ad.id, active: !ad.is_active })}
                         className={`p-2.5 rounded-xl transition ${
                           ad.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                         }`}
                      >
                        {ad.is_active ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button 
                        onClick={() => window.confirm("Delete this ad?") && deleteAdMutation.mutate(ad.id)}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

